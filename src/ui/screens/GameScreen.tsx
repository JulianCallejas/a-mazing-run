import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { useNavigate } from 'react-router-dom';
import useGameStore from '../../store/useGameStore';
import { GAME_CONFIG } from '../../utils/constants';
import { audioSystem } from '../../systems/AudioSystem';
import { createGameEngine, DIRECTION_VECTORS, type GameEvent, type GameStatus } from '../../game/core/engine';
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
import TouchControls from '../hud/TouchControls';

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

const createRun = (difficulty: Difficulty) => {
  const size = GAME_CONFIG.DIFFICULTY[difficulty].mazeSize;
  const maze = generateMaze({ width: size, height: size });
  const rig: CameraRigState = { yawIndex: initialYawIndex(maze), zoom: 3.5 };
  return { id: ++runCounter, engine: createGameEngine({ maze, difficulty }), rig };
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
  const { engine, rig } = run;

  // QA bots read the live engine only when the app was opened with ?debug.
  useEffect(() => {
    if (!showDiagnostics) return;
    window.__mazeEngine = engine;
    return () => {
      window.__mazeEngine = undefined;
    };
  }, [engine, showDiagnostics]);

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
            const entry = highScores.saveScore({ time: event.time, difficulty, visualEffect });
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
    [difficulty, visualEffect, announce],
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
    <div className="w-full h-screen relative overflow-hidden bg-night-950">
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

      <Canvas shadows="soft" dpr={[1, 2]} camera={{ fov: 68, near: 0.05, far: 320 }}>
        <GameLoop engine={engine} onEvents={handleEvents} onFrame={handleFrame} />
        <CameraRig key={run.id} engine={engine} mode={cameraMode} rig={rig} />
        <MazeWorld maze={engine.maze} focus={engine.player.position} effect={visualEffect} cameraMode={cameraMode} />
        {showDiagnostics && <RenderDiagnosticsProbe />}
        <PlayerAvatar actor={engine.player} />
        {engine.enemies.map((enemy) => (
          <GuardianAvatar key={enemy.id} actor={enemy} target={engine.player} />
        ))}
      </Canvas>
    </div>
  );
};

export default GameScreen;
