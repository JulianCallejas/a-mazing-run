import React, { useCallback, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { useNavigate } from 'react-router-dom';
import { Pause, Play, Camera, Home, RotateCcw, Timer, Trophy, Zap } from 'lucide-react';
import useGameStore from '../../store/useGameStore';
import { GAME_CONFIG } from '../../utils/constants';
import { audioSystem } from '../../systems/AudioSystem';
import { createGameEngine, DIRECTION_VECTORS, type GameEvent, type GameStatus } from '../../game/core/engine';
import { generateMaze, isWalkable, type Maze } from '../../game/core/maze';
import { formatTime, type Difficulty } from '../../game/core/scoring';
import { highScores, type ScoreEntry } from '../../game/core/highScores';
import GameLoop from '../../game/scene/GameLoop';
import CameraRig, { type CameraRigState } from '../../game/scene/CameraRig';
import MazeWorld from '../../game/scene/MazeWorld';
import { GuardianAvatar, PlayerAvatar } from '../../game/scene/Avatars';
import { useGameInput } from '../../game/scene/useGameInput';
import RenderDiagnosticsProbe from '../../game/scene/RenderDiagnostics';
import { diagnosticsEnabled } from '../../game/scene/diagnostics';
import MedievalButton from '../components/MedievalButton';

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

const GameScreen: React.FC = () => {
  const navigate = useNavigate();
  const difficulty = useGameStore((s) => s.difficulty);
  const visualEffect = useGameStore((s) => s.visualEffect);
  const cameraMode = useGameStore((s) => s.cameraMode);
  const toggleCameraMode = useGameStore((s) => s.toggleCameraMode);

  const [run, setRun] = useState(() => createRun(difficulty));
  const [status, setStatus] = useState<GameStatus>('ready');
  const [result, setResult] = useState<ScoreEntry | null>(null);
  const timeLabel = useRef<HTMLSpanElement>(null);
  const [showDiagnostics] = useState(diagnosticsEnabled);
  const { engine, rig } = run;

  const syncStatus = useCallback(() => setStatus(engine.status), [engine]);

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
          case 'won':
            setResult(highScores.saveScore({ time: event.time, difficulty, visualEffect }));
            setStatus('won');
            audioSystem.playSoundEffect('victory', 0.8);
            break;
          case 'lost':
            setStatus('lost');
            audioSystem.playSoundEffect('defeat', 0.8);
            break;
        }
      }
    },
    [difficulty, visualEffect],
  );

  const handleFrame = useCallback((elapsed: number) => {
    const label = timeLabel.current;
    if (!label) return;
    const text = formatTime(elapsed);
    if (label.textContent !== text) label.textContent = text;
  }, []);

  useGameInput({
    engine,
    mode: cameraMode,
    rig,
    onStatusChange: syncStatus,
    onToggleCamera: toggleCameraMode,
    onTogglePause: togglePause,
  });

  const handleRestart = () => {
    // Reset the HUD timer immediately; the next frame of the new run may take a moment.
    if (timeLabel.current) timeLabel.current.textContent = formatTime(0);
    setRun(createRun(difficulty));
    setStatus('ready');
    setResult(null);
  };

  const handleExit = () => navigate('/');

  const finished = status === 'won' || status === 'lost';

  return (
    <div className="w-full h-screen relative bg-gray-900">
      {/* Game UI Overlay */}
      <div className="absolute top-4 left-4 right-4 z-10 flex justify-between items-start">
        <div className="bg-black/50 backdrop-blur-sm rounded-lg p-4 text-white space-y-2">
          <div className="flex items-center">
            <Timer className="w-4 h-4 mr-2" />
            <span className="font-cinzel">
              Time: <span ref={timeLabel}>0:00</span>
            </span>
          </div>
          <div className="flex items-center">
            <Trophy className="w-4 h-4 mr-2" />
            <span className="font-cinzel">Difficulty: {GAME_CONFIG.DIFFICULTY[difficulty].name}</span>
          </div>
          <div className="flex items-center">
            <Zap className="w-4 h-4 mr-2" />
            <span className="font-cinzel">Effect: {GAME_CONFIG.VISUAL_EFFECTS[visualEffect].name}</span>
          </div>
        </div>

        <div className="bg-black/50 backdrop-blur-sm rounded-lg p-4 space-y-2">
          <div className="flex space-x-2">
            <MedievalButton
              onClick={togglePause}
              variant="secondary"
              size="sm"
              disabled={finished || status === 'ready'}
            >
              {status === 'paused' ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            </MedievalButton>
            <MedievalButton onClick={toggleCameraMode} variant="secondary" size="sm">
              <Camera className="w-4 h-4" />
            </MedievalButton>
            <MedievalButton onClick={handleRestart} variant="secondary" size="sm">
              <RotateCcw className="w-4 h-4" />
            </MedievalButton>
            <MedievalButton onClick={handleExit} variant="danger" size="sm">
              <Home className="w-4 h-4" />
            </MedievalButton>
          </div>
        </div>
      </div>

      {status === 'ready' && (
        <div className="absolute inset-x-0 top-1/3 z-10 flex justify-center pointer-events-none">
          <div className="bg-black/60 rounded-lg px-6 py-3 text-amber-100 font-cinzel text-lg">
            Move to begin your escape
          </div>
        </div>
      )}

      {/* Controls Help */}
      <div className="absolute bottom-4 left-4 z-10 bg-black/50 backdrop-blur-sm rounded-lg p-3 text-white text-sm">
        <div className="font-cinzel space-y-1">
          {cameraMode === 'third-person' ? (
            <>
              <div>W / ↑: Forward · S / ↓: Back</div>
              <div>A / ← · D / →: Turn</div>
              <div>Mouse wheel: Zoom</div>
            </>
          ) : (
            <div>WASD / Arrows: Move (north is up)</div>
          )}
          <div>C: Camera · Esc / P: Pause</div>
        </div>
      </div>

      {finished && (
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm z-20 flex items-center justify-center">
          <div className="bg-gradient-to-br from-amber-50 to-amber-100 border-4 border-amber-900 rounded-xl p-8 text-center max-w-md">
            <h2 className="font-cinzel-decorative text-3xl font-bold text-amber-900 mb-4">
              {status === 'won' ? 'Quest Complete!' : 'Quest Failed!'}
            </h2>
            {status === 'won' && result && (
              <div className="space-y-2 mb-6">
                <div className="flex items-center justify-center text-amber-800">
                  <Trophy className="w-5 h-5 mr-2" />
                  <span className="font-cinzel font-semibold">Score: {result.score}</span>
                </div>
                <div className="flex items-center justify-center text-amber-800">
                  <Timer className="w-5 h-5 mr-2" />
                  <span className="font-cinzel">Time: {formatTime(result.time)}</span>
                </div>
              </div>
            )}
            <div className="space-y-3">
              <MedievalButton onClick={handleRestart} variant="primary" size="md" className="w-full">
                Try Again
              </MedievalButton>
              <MedievalButton onClick={handleExit} variant="secondary" size="md" className="w-full">
                Return Home
              </MedievalButton>
            </div>
          </div>
        </div>
      )}

      {status === 'paused' && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm z-20 flex items-center justify-center">
          <div className="bg-gradient-to-br from-amber-50 to-amber-100 border-4 border-amber-900 rounded-xl p-8 text-center">
            <h2 className="font-cinzel-decorative text-2xl font-bold text-amber-900 mb-4">Quest Paused</h2>
            <MedievalButton onClick={togglePause} variant="primary" size="lg">
              Resume Quest
            </MedievalButton>
          </div>
        </div>
      )}

      <Canvas shadows="soft" dpr={[1, 2]} camera={{ fov: 68, near: 0.05, far: 320 }}>
        <GameLoop engine={engine} onEvents={handleEvents} onFrame={handleFrame} />
        <CameraRig key={run.id} engine={engine} mode={cameraMode} rig={rig} />
        <MazeWorld engine={engine} effect={visualEffect} cameraMode={cameraMode} />
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
