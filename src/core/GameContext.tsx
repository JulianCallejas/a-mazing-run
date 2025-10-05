import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { GAME_CONFIG } from '../utils/constants';

export interface GameState {
  currentScreen: 'home' | 'instructions' | 'about' | 'game';
  difficulty: keyof typeof GAME_CONFIG.DIFFICULTY;
  visualEffect: keyof typeof GAME_CONFIG.VISUAL_EFFECTS;
  gameStatus: 'menu' | 'playing' | 'paused' | 'won' | 'lost';
  score: number;
  time: number;
  playerPosition: { x: number, y: number };
  enemyPositions: Array<{ x: number, y: number }>;
  cameraMode: 'third-person' | 'aerial';
  isLoading: boolean;
}

type GameAction = 
  | { type: 'SET_SCREEN'; screen: GameState['currentScreen'] }
  | { type: 'SET_DIFFICULTY'; difficulty: GameState['difficulty'] }
  | { type: 'SET_VISUAL_EFFECT'; effect: GameState['visualEffect'] }
  | { type: 'START_GAME' }
  | { type: 'PAUSE_GAME' }
  | { type: 'RESUME_GAME' }
  | { type: 'WIN_GAME'; score: number; time: number }
  | { type: 'LOSE_GAME' }
  | { type: 'RESET_GAME' }
  | { type: 'UPDATE_PLAYER_POSITION'; position: { x: number, y: number } }
  | { type: 'UPDATE_ENEMY_POSITIONS'; positions: Array<{ x: number, y: number }> }
  | { type: 'TOGGLE_CAMERA' }
  | { type: 'SET_LOADING'; loading: boolean }
  | { type: 'UPDATE_TIME'; time: number };

const initialState: GameState = {
  currentScreen: 'home',
  difficulty: 'MEDIUM',
  visualEffect: 'NONE',
  gameStatus: 'menu',
  score: 0,
  time: 0,
  playerPosition: { x: 0, y: 15 },
  enemyPositions: [],
  cameraMode: 'third-person',
  isLoading: false
};

const gameReducer = (state: GameState, action: GameAction): GameState => {
  switch (action.type) {
    case 'SET_SCREEN':
      return { ...state, currentScreen: action.screen };
    case 'SET_DIFFICULTY':
      return { ...state, difficulty: action.difficulty };
    case 'SET_VISUAL_EFFECT':
      return { ...state, visualEffect: action.effect };
    case 'START_GAME':
      return { 
        ...state, 
        gameStatus: 'playing', 
        time: 0, 
        score: 0,
        playerPosition: { x: 0, y: 15 },
        enemyPositions: []
      };
    case 'PAUSE_GAME':
      return { ...state, gameStatus: 'paused' };
    case 'RESUME_GAME':
      return { ...state, gameStatus: 'playing' };
    case 'WIN_GAME':
      return { 
        ...state, 
        gameStatus: 'won', 
        score: action.score, 
        time: action.time 
      };
    case 'LOSE_GAME':
      return { ...state, gameStatus: 'lost' };
    case 'RESET_GAME':
      return { ...initialState, currentScreen: state.currentScreen };
    case 'UPDATE_PLAYER_POSITION':
      return { ...state, playerPosition: action.position };
    case 'UPDATE_ENEMY_POSITIONS':
      return { ...state, enemyPositions: action.positions };
    case 'TOGGLE_CAMERA':
      return { 
        ...state, 
        cameraMode: state.cameraMode === 'third-person' ? 'aerial' : 'third-person' 
      };
    case 'SET_LOADING':
      return { ...state, isLoading: action.loading };
    case 'UPDATE_TIME':
      return { ...state, time: action.time };
    default:
      return state;
  }
};

const GameContext = createContext<{
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
} | null>(null);

export const GameProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(gameReducer, initialState);

  return (
    <GameContext.Provider value={{ state, dispatch }}>
      {children}
    </GameContext.Provider>
  );
};

export const useGameContext = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGameContext must be used within a GameProvider');
  }
  return context;
};