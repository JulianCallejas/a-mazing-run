import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { GameState, initialGameState, Enemy, HighScore } from './initialState';
import { GAME_CONFIG } from '../utils/constants';

interface GameActions {
  // Navigation
  setScreen: (screen: GameState['currentScreen']) => void;
  setLoading: (loading: boolean) => void;

  // Game Control
  startGame: (difficulty?: keyof typeof GAME_CONFIG.DIFFICULTY) => void;
  pauseGame: () => void;
  resumeGame: () => void;
  endGame: (result: 'won' | 'lost', finalScore?: number, finalTime?: number) => void;
  resetGame: () => void;

  // Configuration
  setDifficulty: (difficulty: keyof typeof GAME_CONFIG.DIFFICULTY) => void;
  setVisualEffect: (effect: keyof typeof GAME_CONFIG.VISUAL_EFFECTS) => void;

  // Player Actions
  movePlayer: (direction: 'up' | 'down' | 'left' | 'right') => void;
  updatePlayerPosition: (position: { x: number; z: number }) => void;
  toggleCameraMode: () => void;
  setCameraMode: (mode: 'third-person' | 'aerial') => void;

  // Maze
  setMazeLayout: (layout: number[][]) => void;
  setMazeSize: (size: { width: number; height: number }) => void;
  setExitPosition: (position: { x: number; z: number }) => void;

  // Enemies
  updateEnemies: (enemies: Enemy[]) => void;
  addEnemy: (enemy: Enemy) => void;
  updateEnemyPosition: (enemyId: string, position: { x: number; z: number }) => void;

  // Scoring & Time
  updateScore: (points: number) => void;
  setScore: (score: number) => void;
  updateTime: (time: number) => void;
  saveHighScore: (name: string) => void;

  // Settings
  toggleSound: () => void;
  toggleMusic: () => void;
}

type GameStore = GameState & GameActions;

const useGameStore = create<GameState & GameActions>()(
  devtools(
    (set, get) => ({
        ...initialGameState,

        // Navigation
        setScreen: (screen) => set({ currentScreen: screen }, false, 'setScreen'),
        setLoading: (loading) => set({ isLoading: loading }, false, 'setLoading'),
        // Game Control
        startGame: (difficulty) => {
          const state = get();
          const gameDifficulty = difficulty || state.difficulty;
          
          set({
            gameStatus: 'playing',
            difficulty: gameDifficulty,
            time: 0,
            score: 0,
            playerPosition: { x: 0, z: 15 },
            enemies: [],
            currentScreen: 'game'
          }, false, 'startGame');
        },

        pauseGame: () => set({ gameStatus: 'paused' }, false, 'pauseGame'),
        resumeGame: () => set({ gameStatus: 'playing' }, false, 'resumeGame'),

        endGame: (result, finalScore, finalTime) => {
          const state = get();
          set({
            gameStatus: result,
            score: finalScore || state.score,
            time: finalTime || state.time
          }, false, 'endGame');
        },

        resetGame: () => {
          const state = get();
          set({
            ...initialGameState,
            currentScreen: state.currentScreen,
            difficulty: state.difficulty,
            visualEffect: state.visualEffect,
            soundEnabled: state.soundEnabled,
            musicEnabled: state.musicEnabled,
            soundVolume: state.soundVolume,
            musicVolume: state.musicVolume,
            highScores: state.highScores
          }, false, 'resetGame');
        },

        // Configuration
        setDifficulty: (difficulty) => set({ difficulty }, false, 'setDifficulty'),
        setVisualEffect: (effect) => set({ visualEffect: effect }, false, 'setVisualEffect'),

        // Player Actions
        movePlayer: (direction) => {
          const state = get();
          const { x, z } = state.playerPosition;
          let newPosition = { x, z };

          switch (direction) {
            case 'up':
              newPosition = { x, z: z - 1 };
              break;
            case 'down':
              newPosition = { x, z: z + 1 };
              break;
            case 'left':
              newPosition = { x: x - 1, z };
              break;
            case 'right':
              newPosition = { x: x + 1, z };
              break;
          }

          // Basic bounds checking (will be enhanced with maze collision)
          if (newPosition.x >= 0 && newPosition.x < state.mazeSize.width &&
              newPosition.z >= 0 && newPosition.z < state.mazeSize.height) {
            set({ playerPosition: newPosition }, false, 'movePlayer');
          }
        },

        updatePlayerPosition: (position) => 
          set({ playerPosition: position }, false, 'updatePlayerPosition'),

        toggleCameraMode: () => {
          const state = get();
          set({
            cameraMode: state.cameraMode === 'third-person' ? 'aerial' : 'third-person'
          }, false, 'toggleCameraMode');
        },

        setCameraMode: (mode) => set({ cameraMode: mode }, false, 'setCameraMode'),

        // Maze
        setMazeLayout: (layout) => set({ mazeLayout: layout }, false, 'setMazeLayout'),
        setMazeSize: (size) => set({ mazeSize: size }, false, 'setMazeSize'),
        setExitPosition: (position) => set({ exitPosition: position }, false, 'setExitPosition'),

        // Enemies
        updateEnemies: (enemies) => set({ enemies }, false, 'updateEnemies'),
        
        addEnemy: (enemy) => {
          const state = get();
          set({ enemies: [...state.enemies, enemy] }, false, 'addEnemy');
        },

        updateEnemyPosition: (enemyId, position) => {
          const state = get();
          const updatedEnemies = state.enemies.map(enemy =>
            enemy.id === enemyId ? { ...enemy, position } : enemy
          );
          set({ enemies: updatedEnemies }, false, 'updateEnemyPosition');
        },

        // Scoring & Time
        updateScore: (points) => {
          const state = get();
          set({ score: state.score + points }, false, 'updateScore');
        },

        setScore: (score) => set({ score }, false, 'setScore'),
        updateTime: (time) => set({ time }, false, 'updateTime'),

        saveHighScore: (name) => {
          const state = get();
          const newScore: HighScore = {
            name,
            score: state.score,
            difficulty: GAME_CONFIG.DIFFICULTY[state.difficulty].name,
            date: new Date().toISOString()
          };

          const updatedHighScores = [...state.highScores, newScore]
            .sort((a, b) => b.score - a.score)
            .slice(0, 10); // Keep only top 10

          set({ highScores: updatedHighScores }, false, 'saveHighScore');
        },

        // Settings
        toggleSound: () => {
          const state = get();
          set({ soundEnabled: !state.soundEnabled }, false, 'toggleSound');
        },

        toggleMusic: () => {
          const state = get();
          set({ musicEnabled: !state.musicEnabled }, false, 'toggleMusic');
        },

        setSoundVolume: (volume) => set({ soundVolume: volume }, false, 'setSoundVolume'),
        setMusicVolume: (volume) => set({ musicVolume: volume }, false, 'setMusicVolume'),
      })
  )
);

export default useGameStore;
