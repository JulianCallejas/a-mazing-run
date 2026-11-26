import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { useNavigate } from 'react-router-dom';
import useGameStore from '../../store/useGameStore';
import { GAME_CONFIG } from '../../utils/constants';
import { audioSystem } from '../../systems/AudioSystem';
import {
  createGameEngine,
  DIRECTION_VECTORS,
  optimalRunTime,
  type GameEvent,
  type GameStatus,
} from '../../game/core/engine';
import { generateMaze, isWalkable, type Maze } from '../../game/core/maze';
import type { Difficulty } from '../../game/core/scoring';
import { highScores, type ScoreEntry } from '../../game/core/highScores';
import GameLoop from '../../game/scene/GameLoop';
import CameraRig, { type CameraRigState } from '../../game/scene/CameraRig';
import MazeWorld from '../../game/scene/MazeWorld';
import { GuardianAvatar, PlayerAvatar } from '../../game/scene/Avatars';
import { useGameInput } from '../../game/scene/useGameInput';
import RenderDiagnosticsProbe from '../../game/scene/RenderDiagnostics';
import { diagnosticsEnabled } from '../../game/scene/diagnostics';
import Hud, { type Banner, type HudHandle } from '../hud/Hud';
import { PauseOverlay, ResultOverlay } from '../hud/Overlays';
import { applyTestState, isTestState, runsWithoutGuardians, type TestState } from '../../game/scene/testHooks';
import TouchControls from '../hud/TouchControls';
import { QUALITY } from '../../game/art/quality';

/** Faces the camera down the first open corridor from the start cell. */
const initialYawIndex = (maze: Maze): number => {
  const order = ['north', 'east', 'south', 'west'] as const;
  const index = order.findIndex((d) => {
    const v = DIRECTION_VECTORS[d];
    return isWalkable(maze.grid, maze.start.x + v.x, maze.start.z + v.z);
  });
  return Math.max(0, index);
};

let runCounter = 0;

interface RunOptions {
  /** Fixed maze seed (QA reproducibility); random when omitted. */
  seed?: number;
  /** QA only: run without guardians. */
  guardians?: boolean;
}

const createRun = (difficulty: Difficulty, options: RunOptions = {}) => {
  const size = GAME_CONFIG.DIFFICULTY[difficulty].mazeSize;
  const maze = generateMaze({ width: size, height: size, seed: options.seed });
  const rig: CameraRigState = { yawIndex: initialYawIndex(maze), zoom: 3.5 };
  const engine = createGameEngine({ maze, difficulty, enemySpawns: options.guardians === false ? [] : undefined });
  return { id: ++runCounter, engine, rig };
};

interface RunResult {
  entry: ScoreEntry | null;
  rank: number | null;
  survived: number;
}

const GameScreen: React.FC = () => {
  const navigate = useNavigate();
  const difficulty = useGameStore((s) => s.difficulty);
  const visualEffect = useGameStore((s) => s.visualEffect);
  const cameraMode = useGameStore((s) => s.cameraMode);
  const soundEnabled = useGameStore((s) => s.soundEnabled);
  const toggleCameraMode = useGameStore((s) => s.toggleCameraMode);
  const toggleSound = useGameStore((s) => s.toggleSound);

  const [run, setRun] = useState(() => createRun(difficulty));
  const [status, setStatus] = useState<GameStatus>('ready');
  const [result, setResult] = useState<RunResult | null>(null);
  const [banner, setBanner] = useState<Banner | null>(null);
  const [showDiagnostics] = useState(diagnosticsEnabled);
  const hud = useRef<HudHandle>(null);
  const guardiansAwake = useRef(false);
  const frozen = useRef(false);
  const pendingState = useRef<{ name: TestState; resolve: (value: { state: string }) => void } | null>(null);
  const qaSeed = useRef(42);
  const { engine, rig } = run;

  // QA bots read the live engine only when the app was opened with ?debug.
  useEffect(() => {
    if (!showDiagnostics) return;
    window.__mazeEngine = engine;
    return () => {
      window.__mazeEngine = undefined;
    };
  }, [engine, showDiagnostics]);

  // QA test-hook contract (?debug only): reproducible states for the canvas inspector.
  useEffect(() => {
    if (!showDiagnostics) return;
    window.__THREE_GAME_TEST_HOOKS__ = {
      seed: (seed) => {
        qaSeed.current = seed;
        return { seed };
      },
      setPausedForScreenshot: (paused) => {
        frozen.current = paused;
      },
      setState: (name) =>
        new Promise((resolve, reject) => {
          if (!isTestState(name)) {
            reject(new Error(`Unknown test state: ${name}`));
            return;
          }
          frozen.current = false;
          pendingState.current = { name, resolve };
          useGameStore.getState().setCameraMode(name === 'aerial-map' ? 'aerial' : 'third-person');
          hud.current?.resetTimer();
          guardiansAwake.current = false;
          setResult(null);
          setBanner(null);
          setRun(
            createRun(useGameStore.getState().difficulty, {
              seed: qaSeed.current,
              guardians: !runsWithoutGuardians(name),
            }),
          );
        }),
    };
    return () => {
      window.__THREE_GAME_TEST_HOOKS__ = undefined;
    };
  }, [showDiagnostics]);

  // Applies a pending QA state to the freshly created run.
  useEffect(() => {
    const pending = pendingState.current;
    if (!pending) return;
    pendingState.current = null;
    applyTestState(engine, pending.name, rig);
    // Hold simulated time at the requested state while the camera settles;
    // rendering and event draining continue (the inspector freezes again later).
    frozen.current = true;
    let frames = 0;
    const settle = () => {
      frames += 1;
      // Won/lost arrive through engine events; other states sync here.
      if (frames === 1 && engine.status !== 'won' && engine.status !== 'lost') setStatus(engine.status);
      // ~0.75 s at 60 fps: lets the camera rig finish turning behind the hero.
      if (frames < 45) requestAnimationFrame(settle);
      else pending.resolve({ state: pending.name });
    };
    requestAnimationFrame(settle);
  }, [engine, rig]);

  const announce = useCallback((text: string, tone: Banner['tone']) => {
    setBanner({ id: performance.now(), text, tone });
  }, []);

  const syncStatus = useCallback(() => {
    if (engine.status === 'playing' && engine.elapsed === 0) announce('Find the golden gate', 'gold');
    setStatus(engine.status);
  }, [engine, announce]);

  const togglePause = useCallback(() => {
    if (engine.status === 'playing') engine.pause();
    else if (engine.status === 'paused') engine.resume();
    setStatus(engine.status);
  }, [engine]);

  const handleEvents = useCallback(
    (events: GameEvent[]) => {
      for (const event of events) {
        switch (event.type) {
          case 'step':
            audioSystem.playSoundEffect('step', 0.3);
            break;
          case 'bump':
            audioSystem.playSoundEffect('wall-hit', 0.5);
            break;
          case 'awaken':
            guardiansAwake.current = true;
            announce('The guardians awaken', 'danger');
            audioSystem.playSoundEffect('awaken', 0.7);
            break;
          case 'won': {
            const entry = highScores.saveScore({
              time: event.time,
              optimalTime: optimalRunTime(run.engine.maze),
              difficulty,
              visualEffect,
            });
            const index = highScores.getTopScores().findIndex((e) => e.id === entry.id);
            setResult({ entry, rank: index >= 0 ? index + 1 : null, survived: event.time });
            setStatus('won');
            audioSystem.playSoundEffect('victory', 0.8);
            break;
          }
          case 'lost':
            setResult({ entry: null, rank: null, survived: event.time });
            setStatus('lost');
            audioSystem.playSoundEffect('defeat', 0.8);
            break;
        }
      }
    },
    [difficulty, visualEffect, announce, run.engine],
  );

  const handleFrame = useCallback(() => {
    const threat = hud.current?.update(engine, performance.now() / 1000, guardiansAwake.current) ?? 0;
    audioSystem.setDanger(threat);
  }, [engine]);

  // Silence the heartbeat when leaving the game screen.
  useEffect(() => () => audioSystem.setDanger(0), []);

  const intents = useGameInput({
    engine,
    mode: cameraMode,
    rig,
    onStatusChange: syncStatus,
    onToggleCamera: toggleCameraMode,
    onTogglePause: togglePause,
  });

  const handleRestart = () => {
    // Reset HUD values immediately; the first frame of the new run may take a moment.
    hud.current?.resetTimer();
    guardiansAwake.current = false;
    setRun(createRun(difficulty));
    setStatus('ready');
    setResult(null);
    setBanner(null);
  };

  const handleExit = () => navigate('/');

  return (
    <div className="w-full h-dvh relative overflow-hidden bg-night-950">
      {/* The 3D canvas comes first in the DOM (QA tools sample the first canvas); HUD layers stack above via z-index. */}
      <Canvas shadows="soft" dpr={[1, QUALITY.maxDpr]} camera={{ fov: 68, near: 0.05, far: 320 }}>
        <GameLoop engine={engine} onEvents={handleEvents} onFrame={handleFrame} frozen={frozen} />
        <CameraRig engine={engine} mode={cameraMode} rig={rig} />
        <MazeWorld
          maze={engine.maze}
          focus={engine.player.position}
          effect={visualEffect}
          cameraMode={cameraMode}
          celebrating={status === 'won'}
        />
        {showDiagnostics && <RenderDiagnosticsProbe />}
        <PlayerAvatar
          key={run.id}
          actor={engine.player}
          outcome={status === 'won' || status === 'lost' ? status : null}
        />
        {engine.enemies.map((enemy) => (
          <GuardianAvatar key={enemy.id} actor={enemy} target={engine.player} />
        ))}
      </Canvas>

      <Hud
        ref={hud}
        engine={engine}
        status={status}
        difficulty={difficulty}
        effect={visualEffect}
        cameraMode={cameraMode}
        soundEnabled={soundEnabled}
        banner={banner}
        onTogglePause={togglePause}
        onToggleCamera={toggleCameraMode}
        onToggleSound={toggleSound}
        onRestart={handleRestart}
        onExit={handleExit}
      />

      <TouchControls intents={intents} mode={cameraMode} />

      {status === 'paused' && (
        <PauseOverlay
          soundEnabled={soundEnabled}
          onResume={togglePause}
          onRestart={handleRestart}
          onToggleSound={toggleSound}
          onExit={handleExit}
        />
      )}

      {(status === 'won' || status === 'lost') && result && (
        <ResultOverlay
          outcome={status}
          entry={result.entry}
          rank={result.rank}
          survived={result.survived}
          difficulty={difficulty}
          effect={visualEffect}
          onRetry={handleRestart}
          onExit={handleExit}
        />
      )}

    </div>
  );
};

export default GameScreen;
