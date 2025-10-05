import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment } from '@react-three/drei';
import { useNavigate } from 'react-router-dom';
import { useGameContext } from '../../core/GameContext';
import { getDefaultMaze } from '../../core/MazeGenerator';
import { ScoreManager } from '../../core/ScoreManager';
import { GAME_CONFIG, MAZE_CELLS, KEYS } from '../../utils/constants';
import { formatTime } from '../../utils/helpers';
import { audioSystem } from '../../systems/AudioSystem';
import Player from '../../entities/Player';
import Enemy from '../../entities/Enemy';
import MedievalButton from '../components/MedievalButton';
import LoadingSpinner from '../components/LoadingSpinner';
import { 
  Pause, Play, Camera, Home, RotateCcw, 
  Timer, Trophy, Zap, Target 
} from 'lucide-react';
import * as THREE from 'three';

const GameScreen: React.FC = () => {
  const navigate = useNavigate();
  const { state, dispatch } = useGameContext();
  const [maze, setMaze] = useState<number[][]>([]);
  const [gameTime, setGameTime] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [cameraRotation, setCameraRotation] = useState(0); // Camera rotation in radians
  const [cameraDistance, setCameraDistance] = useState(4); // Camera distance from player
  const gameStartTime = useRef<number>(0);
  const animationFrame = useRef<number>();
  const keysPressed = useRef(new Set<string>());

  // Find valid positions in maze
  const findValidPositions = (mazeData: number[][]) => {
    const positions: Array<{ x: number, y: number }> = [];
    for (let y = 0; y < mazeData.length; y++) {
      for (let x = 0; x < mazeData[y].length; x++) {
        if (mazeData[y][x] === MAZE_CELLS.PATH || mazeData[y][x] === MAZE_CELLS.START) {
          positions.push({ x, y });
        }
      }
    }
    return positions;
  };

  // Calculate distance between two points
  const calculateDistance = (pos1: { x: number, y: number }, pos2: { x: number, y: number }) => {
    return Math.sqrt(Math.pow(pos1.x - pos2.x, 2) + Math.pow(pos1.y - pos2.y, 2));
  };

  // Initialize game
  useEffect(() => {
    const initializeGame = async () => {
      setIsLoading(true);
      
      // Load maze
      const mazeData = getDefaultMaze();
      setMaze(mazeData);
      
      // Find start position
      let startPos = { x: 0, y: 15 };
      for (let y = 0; y < mazeData.length; y++) {
        for (let x = 0; x < mazeData[y].length; x++) {
          if (mazeData[y][x] === MAZE_CELLS.START) {
            startPos = { x, y };
            break;
          }
        }
      }
      
      dispatch({ type: 'UPDATE_PLAYER_POSITION', position: startPos });
      
      // Find valid positions for enemies
      const validPositions = findValidPositions(mazeData);
      const mazeWidth = mazeData[0].length;
      const mazeHeight = mazeData.length;
      const minDistance = Math.max(mazeWidth, mazeHeight) * 0.3; // 30% of maze size
      
      // Filter positions that are far enough from start
      const farPositions = validPositions.filter(pos => 
        calculateDistance(pos, startPos) >= minDistance
      );
      
      // Initialize enemies at random far positions
      const enemyPositions = [];
      const difficultyConfig = GAME_CONFIG.DIFFICULTY[state.difficulty];
      const availablePositions = [...farPositions];
      
      for (let i = 0; i < difficultyConfig.enemyCount && availablePositions.length > 0; i++) {
        const randomIndex = Math.floor(Math.random() * availablePositions.length);
        const enemyPos = availablePositions.splice(randomIndex, 1)[0];
        enemyPositions.push(enemyPos);
      }
      
      // Fallback if no far positions available
      if (enemyPositions.length === 0 && validPositions.length > 1) {
        const fallbackPos = validPositions[Math.floor(Math.random() * validPositions.length)];
        if (fallbackPos.x !== startPos.x || fallbackPos.y !== startPos.y) {
          enemyPositions.push(fallbackPos);
        }
      }
      
      dispatch({ type: 'UPDATE_ENEMY_POSITIONS', positions: enemyPositions });
      
      // Start background music
      audioSystem.playBackgroundMusic();
      
      gameStartTime.current = Date.now();
      setIsLoading(false);
    };

    if (state.gameStatus === 'playing') {
      initializeGame();
    }

    return () => {
      if (animationFrame.current) {
        cancelAnimationFrame(animationFrame.current);
      }
      audioSystem.stopBackgroundMusic();
    };
  }, [state.gameStatus, state.difficulty, dispatch]);

  // Game time tracking
  useEffect(() => {
    if (state.gameStatus === 'playing') {
      const updateTime = () => {
        const elapsed = (Date.now() - gameStartTime.current) / 1000;
        setGameTime(elapsed);
        dispatch({ type: 'UPDATE_TIME', time: elapsed });
        animationFrame.current = requestAnimationFrame(updateTime);
      };
      animationFrame.current = requestAnimationFrame(updateTime);
    }

    return () => {
      if (animationFrame.current) {
        cancelAnimationFrame(animationFrame.current);
      }
    };
  }, [state.gameStatus, dispatch]);

  // Mouse wheel zoom control
  const handleWheel = useCallback((event: WheelEvent) => {
    if (state.cameraMode === 'third-person') {
      event.preventDefault();
      const delta = event.deltaY > 0 ? 0.5 : -0.5;
      setCameraDistance(prev => Math.max(2, Math.min(8, prev + delta)));
    }
  }, [state.cameraMode]);

  useEffect(() => {
    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => window.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  // Keyboard controls
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (state.gameStatus !== 'playing') return;

    keysPressed.current.add(event.code);
    
    let newX = state.playerPosition.x;
    let newY = state.playerPosition.y;

    if (state.cameraMode === 'third-person') {
      // Third-person camera controls
      if (event.code === KEYS.ARROW_LEFT) {
        // Rotate camera left (90 degrees)
        setCameraRotation(prev => prev + Math.PI / 2);
        return;
      } else if (event.code === KEYS.ARROW_RIGHT) {
        // Rotate camera right (90 degrees)
        setCameraRotation(prev => prev - Math.PI / 2);
        return;
      } else if (event.code === KEYS.ARROW_UP || event.code === KEYS.W) {
        // Move forward in camera direction
        const moveX = Math.round(Math.sin(cameraRotation));
        const moveY = Math.round(-Math.cos(cameraRotation));
        newX += moveX;
        newY += moveY;
      } else if (event.code === KEYS.ARROW_DOWN || event.code === KEYS.S) {
        // Move backward from camera direction
        const moveX = Math.round(-Math.sin(cameraRotation));
        const moveY = Math.round(Math.cos(cameraRotation));
        newX += moveX;
        newY += moveY;
      }
    } else {
      // Aerial view - traditional WASD/Arrow controls
      if (event.code === KEYS.W || event.code === KEYS.ARROW_UP) {
        newY = Math.max(0, newY - 1);
      } else if (event.code === KEYS.S || event.code === KEYS.ARROW_DOWN) {
        newY = Math.min(maze.length - 1, newY + 1);
      } else if (event.code === KEYS.A || event.code === KEYS.ARROW_LEFT) {
        newX = Math.max(0, newX - 1);
      } else if (event.code === KEYS.D || event.code === KEYS.ARROW_RIGHT) {
        newX = Math.min(maze[0]?.length - 1 || 0, newX + 1);
      }
    }

    if (event.code === KEYS.C) {
      dispatch({ type: 'TOGGLE_CAMERA' });
      return;
    }

    // Check for wall collision
    if (maze[newY] && maze[newY][newX] !== MAZE_CELLS.WALL) {
      dispatch({ type: 'UPDATE_PLAYER_POSITION', position: { x: newX, y: newY } });
      audioSystem.playSoundEffect('step', 0.3);

      // Check for win condition
      if (maze[newY][newX] === MAZE_CELLS.EXIT) {
        handleWin();
      }
    } else {
      audioSystem.playSoundEffect('wall-hit', 0.5);
    }
  }, [state.gameStatus, state.playerPosition, state.cameraMode, maze, cameraRotation, dispatch]);

  const handleKeyUp = useCallback((event: KeyboardEvent) => {
    keysPressed.current.delete(event.code);
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  const handleWin = () => {
    const finalTime = (Date.now() - gameStartTime.current) / 1000;
    const finalScore = ScoreManager.saveScore(
      finalTime,
      state.difficulty,
      state.visualEffect
    );
    
    dispatch({ type: 'WIN_GAME', score: finalScore.score, time: finalTime });
    audioSystem.playSoundEffect('victory', 0.8);
  };

  const handleLose = () => {
    dispatch({ type: 'LOSE_GAME' });
    audioSystem.playSoundEffect('defeat', 0.8);
  };

  const handlePause = () => {
    if (state.gameStatus === 'playing') {
      dispatch({ type: 'PAUSE_GAME' });
    } else if (state.gameStatus === 'paused') {
      dispatch({ type: 'RESUME_GAME' });
      gameStartTime.current = Date.now() - gameTime * 1000;
    }
  };

  const handleRestart = () => {
    dispatch({ type: 'RESET_GAME' });
    dispatch({ type: 'START_GAME' });
  };

  const handleExit = () => {
    dispatch({ type: 'RESET_GAME' });
    navigate('/');
  };

  // Render maze walls
  const renderMaze = () => {
    const walls: JSX.Element[] = [];
    const floors: JSX.Element[] = [];

    maze.forEach((row, y) => {
      row.forEach((cell, x) => {
        // Floor for all non-wall cells
        if (cell !== MAZE_CELLS.WALL) {
          floors.push(
            <mesh key={`floor-${x}-${y}`} position={[x, -0.5, y]} receiveShadow>
              <boxGeometry args={[1, 0.1, 1]} />
              <meshStandardMaterial 
                color="#8B4513" 
                roughness={0.8}
                metalness={0.1}
              />
            </mesh>
          );
        }

        // Walls
        if (cell === MAZE_CELLS.WALL) {
          walls.push(
            <mesh key={`wall-${x}-${y}`} position={[x, 1, y]} castShadow receiveShadow>
              <boxGeometry args={[1, 2, 1]} />
              <meshStandardMaterial 
                color="#555555" 
                roughness={0.9}
                metalness={0.1}
              />
            </mesh>
          );
        }

        // Exit marker
        if (cell === MAZE_CELLS.EXIT) {
          floors.push(
            <mesh key={`exit-${x}-${y}`} position={[x, 0.1, y]}>
              <cylinderGeometry args={[0.4, 0.4, 0.2]} />
              <meshStandardMaterial 
                color="#FFD700" 
                emissive="#FFAA00"
                emissiveIntensity={0.3}
              />
            </mesh>
          );
        }
      });
    });

    return [...floors, ...walls];
  };

  // Visual effects
  const renderEffects = () => {
    const effectType = state.visualEffect;
    
    if (effectType === 'FOG') {
      return <fog attach="fog" args={['#666666', 8, 25]} />;
    } else if (effectType === 'SNOW') {
      // Snow particles effect
      const snowParticles = [];
      for (let i = 0; i < 200; i++) {
        snowParticles.push(
          <mesh 
            key={`snow-${i}`} 
            position={[
              (Math.random() - 0.5) * 60,
              Math.random() * 20 + 10,
              (Math.random() - 0.5) * 60
            ]}
          >
            <sphereGeometry args={[0.02]} />
            <meshBasicMaterial color="#FFFFFF" transparent opacity={0.8} />
          </mesh>
        );
      }
      return (
        <>
          <fog attach="fog" args={['#E6F3FF', 10, 30]} />
          {snowParticles}
        </>
      );
    } else if (effectType === 'RAIN') {
      // Rain effect with darker atmosphere
      const rainDrops = [];
      for (let i = 0; i < 300; i++) {
        rainDrops.push(
          <mesh 
            key={`rain-${i}`} 
            position={[
              (Math.random() - 0.5) * 60,
              Math.random() * 20 + 10,
              (Math.random() - 0.5) * 60
            ]}
            rotation={[0, 0, Math.PI / 6]}
          >
            <cylinderGeometry args={[0.005, 0.005, 0.3]} />
            <meshBasicMaterial color="#87CEEB" transparent opacity={0.6} />
          </mesh>
        );
      }
      return (
        <>
          <fog attach="fog" args={['#4A5568', 6, 20]} />
          {rainDrops}
        </>
      );
    }
    
    return null;
  };

  // Calculate camera position based on mode and rotation
  const getCameraPosition = () => {
    const playerX = state.playerPosition.x;
    const playerY = state.playerPosition.y;
    
    if (state.cameraMode === 'aerial') {
      return [playerX, 20, playerY + 5];
    } else {
      // Third-person camera with rotation and zoom
      const height = 2.5;
      const cameraX = playerX + Math.sin(cameraRotation) * cameraDistance;
      const cameraZ = playerY + Math.cos(cameraRotation) * cameraDistance;
      
      return [cameraX, height, cameraZ];
    }
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="w-full h-screen relative bg-gray-900">
      {/* Game UI Overlay */}
      <div className="absolute top-4 left-4 right-4 z-10 flex justify-between items-start">
        {/* Game Stats */}
        <div className="bg-black/50 backdrop-blur-sm rounded-lg p-4 text-white space-y-2">
          <div className="flex items-center">
            <Timer className="w-4 h-4 mr-2" />
            <span className="font-cinzel">Time: {formatTime(gameTime)}</span>
          </div>
          <div className="flex items-center">
            <Trophy className="w-4 h-4 mr-2" />
            <span className="font-cinzel">Difficulty: {GAME_CONFIG.DIFFICULTY[state.difficulty].name}</span>
          </div>
          <div className="flex items-center">
            <Zap className="w-4 h-4 mr-2" />
            <span className="font-cinzel">Effect: {GAME_CONFIG.VISUAL_EFFECTS[state.visualEffect].name}</span>
          </div>
        </div>

        {/* Game Controls */}
        <div className="bg-black/50 backdrop-blur-sm rounded-lg p-4 space-y-2">
          <div className="flex space-x-2">
            <MedievalButton
              onClick={handlePause}
              variant="secondary"
              size="sm"
              disabled={state.gameStatus === 'won' || state.gameStatus === 'lost'}
            >
              {state.gameStatus === 'paused' ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            </MedievalButton>
            
            <MedievalButton
              onClick={() => dispatch({ type: 'TOGGLE_CAMERA' })}
              variant="secondary"
              size="sm"
            >
              <Camera className="w-4 h-4" />
            </MedievalButton>
            
            <MedievalButton
              onClick={handleRestart}
              variant="secondary"
              size="sm"
            >
              <RotateCcw className="w-4 h-4" />
            </MedievalButton>
            
            <MedievalButton
              onClick={handleExit}
              variant="danger"
              size="sm"
            >
              <Home className="w-4 h-4" />
            </MedievalButton>
          </div>
        </div>
      </div>

      {/* Controls Help */}
      {state.cameraMode === 'third-person' && (
        <div className="absolute bottom-4 left-4 z-10 bg-black/50 backdrop-blur-sm rounded-lg p-3 text-white text-sm">
          <div className="font-cinzel space-y-1">
            <div>↑/W: Move Forward</div>
            <div>↓/S: Move Backward</div>
            <div>←/→: Rotate Camera</div>
            <div>Mouse Wheel: Zoom</div>
            <div>C: Toggle Camera</div>
          </div>
        </div>
      )}

      {/* Game Over Overlays */}
      {(state.gameStatus === 'won' || state.gameStatus === 'lost') && (
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm z-20 flex items-center justify-center">
          <div className="bg-gradient-to-br from-amber-50 to-amber-100 border-4 border-amber-900 rounded-xl p-8 text-center max-w-md">
            <h2 className="font-cinzel-decorative text-3xl font-bold text-amber-900 mb-4">
              {state.gameStatus === 'won' ? 'Quest Complete!' : 'Quest Failed!'}
            </h2>
            
            {state.gameStatus === 'won' && (
              <div className="space-y-2 mb-6">
                <div className="flex items-center justify-center text-amber-800">
                  <Trophy className="w-5 h-5 mr-2" />
                  <span className="font-cinzel font-semibold">Score: {state.score}</span>
                </div>
                <div className="flex items-center justify-center text-amber-800">
                  <Timer className="w-5 h-5 mr-2" />
                  <span className="font-cinzel">Time: {formatTime(state.time)}</span>
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

      {/* Pause Overlay */}
      {state.gameStatus === 'paused' && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm z-20 flex items-center justify-center">
          <div className="bg-gradient-to-br from-amber-50 to-amber-100 border-4 border-amber-900 rounded-xl p-8 text-center">
            <h2 className="font-cinzel-decorative text-2xl font-bold text-amber-900 mb-4">
              Quest Paused
            </h2>
            <MedievalButton onClick={handlePause} variant="primary" size="lg">
              Resume Quest
            </MedievalButton>
          </div>
        </div>
      )}

      {/* 3D Game World */}
      <Canvas shadows camera={{ position: [0, 10, 0], fov: 75 }}>
        {renderEffects()}
        
        {/* Lighting */}
        <ambientLight intensity={state.visualEffect === 'RAIN' ? 0.2 : 0.4} />
        <directionalLight
          position={[10, 10, 5]}
          intensity={state.visualEffect === 'RAIN' ? 0.5 : 0.8}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />
        
        {/* Environment */}
        <Environment preset={state.visualEffect === 'RAIN' ? 'night' : 'sunset'} />
        
        {/* Camera Setup */}
        <PerspectiveCamera
          makeDefault
          position={getCameraPosition()}
          fov={state.cameraMode === 'aerial' ? 60 : 75}
        />
        
        <OrbitControls
          target={[state.playerPosition.x, 0, state.playerPosition.y]}
          enablePan={false}
          enableZoom={false}
          enableRotate={state.cameraMode === 'aerial'}
        />

        {/* Game Objects */}
        {renderMaze()}
        
        <Player 
          position={[state.playerPosition.x, 0.5, state.playerPosition.y]}
        />
        
        {state.enemyPositions.map((enemy, index) => (
          <Enemy
            key={index}
            position={[enemy.x, 0.5, enemy.y]}
            playerPosition={state.playerPosition}
            maze={maze}
            speed={GAME_CONFIG.DIFFICULTY[state.difficulty].speedMultiplier}
            onCatchPlayer={handleLose}
            isPaused={state.gameStatus === 'paused'}
          />
        ))}
      </Canvas>
    </div>
  );
};

export default GameScreen;