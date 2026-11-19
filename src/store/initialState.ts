import { GAME_CONFIG } from '../utils/constants';

export interface Enemy {
  id: string;
  position: { x: number; z: number };
  speed: number;
  isActive: boolean;
}

export interface GameState {
  // Navigation & UI
  currentScreen: 'home' | 'instructions' | 'about' | 'game';
  isLoading: boolean;

  // Game State
  gameStatus: 'menu' | 'playing' | 'paused' | 'won' | 'lost';
  difficulty: keyof typeof GAME_CONFIG.DIFFICULTY;
  visualEffect: keyof typeof GAME_CONFIG.VISUAL_EFFECTS;
  score: number;
  time: number;

  // Player State
  playerPosition: { x: number; z: number };
  playerLives: number;
  cameraMode: 'third-person' | 'aerial';

  // Maze Configuration
  mazeSize: { width: number; height: number };
  mazeLayout: number[][];
  exitPosition: { x: number; z: number };

  // Enemies
  enemies: Enemy[];

  // Settings
  soundEnabled: boolean;
  musicEnabled: boolean;
  soundVolume: number;
  musicVolume: number;
}

export const initialGameState: GameState = {
  // Navigation & UI
  currentScreen: 'home',
  isLoading: false,

  // Game State
  gameStatus: 'menu',
  difficulty: 'MEDIUM',
  visualEffect: 'NONE',
  score: 0,
  time: 0,

  // Player State
  playerPosition: { x: 0, z: 15 },
  playerLives: 3,
  cameraMode: 'third-person',

  // Maze Configuration
  mazeSize: { width: 16, height: 16 },
  mazeLayout: [],
  exitPosition: { x: 15, z: 0 },

  // Enemies
  enemies: [],

  // Settings
  soundEnabled: true,
  musicEnabled: true,
  soundVolume: 0.7,
  musicVolume: 0.5,
};
