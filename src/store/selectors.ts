import useGameStore from './useGameStore';

// Game state selectors
export const useGameStatus = () => useGameStore((state) => state.gameStatus);
export const useCurrentScreen = () => useGameStore((state) => state.currentScreen);
export const useIsLoading = () => useGameStore((state) => state.isLoading);

// Player selectors
export const usePlayerState = () => useGameStore(
  (state) => ({
    position: state.playerPosition,
    lives: state.playerLives,
    cameraMode: state.cameraMode,
  })
);

export const usePlayerPosition = () => useGameStore((state) => state.playerPosition);
export const useCameraMode = () => useGameStore((state) => state.cameraMode);

// Game configuration selectors
export const useGameConfig = () => useGameStore(
  (state) => ({
    difficulty: state.difficulty,
    visualEffect: state.visualEffect,
  })
);

export const useDifficulty = () => useGameStore((state) => state.difficulty);
export const useVisualEffect = () => useGameStore((state) => state.visualEffect);

// Maze selectors
export const useMazeState = () => useGameStore(
  (state) => ({
    layout: state.mazeLayout,
    size: state.mazeSize,
    exitPosition: state.exitPosition,
  })
);

export const useMazeLayout = () => useGameStore((state) => state.mazeLayout);
export const useMazeSize = () => useGameStore((state) => state.mazeSize);

// Enemy selectors
export const useEnemies = () => useGameStore((state) => state.enemies);
export const useActiveEnemies = () => useGameStore(
  (state) => state.enemies.filter(enemy => enemy.isActive)
);

// Score and time selectors
export const useGameProgress = () => useGameStore(
  (state) => ({
    score: state.score,
    time: state.time,
  })
);

export const useScore = () => useGameStore((state) => state.score);
export const useTime = () => useGameStore((state) => state.time);
export const useHighScores = () => useGameStore((state) => state.highScores);

// Settings selectors
export const useAudioSettings = () => useGameStore(
  (state) => ({
    soundEnabled: state.soundEnabled,
    musicEnabled: state.musicEnabled,
    soundVolume: state.soundVolume,
    musicVolume: state.musicVolume,
  })
);

// Action selectors (for components that only need actions)
export const useGameActions = () => useGameStore(
  (state) => ({
    setScreen: state.setScreen,
    setLoading: state.setLoading,
    startGame: state.startGame,
    pauseGame: state.pauseGame,
    resumeGame: state.resumeGame,
    endGame: state.endGame,
    resetGame: state.resetGame,
  })
);

export const usePlayerActions = () => useGameStore(
  (state) => ({
    movePlayer: state.movePlayer,
    updatePlayerPosition: state.updatePlayerPosition,
    toggleCameraMode: state.toggleCameraMode,
    setCameraMode: state.setCameraMode,
  })
);

export const useConfigActions = () => useGameStore(
  (state) => ({
    setDifficulty: state.setDifficulty,
    setVisualEffect: state.setVisualEffect,
  })
);

export const useMazeActions = () => useGameStore(
  (state) => ({
    setMazeLayout: state.setMazeLayout,
    setMazeSize: state.setMazeSize,
    setExitPosition: state.setExitPosition,
  })
);

export const useEnemyActions = () => useGameStore(
  (state) => ({
    updateEnemies: state.updateEnemies,
    addEnemy: state.addEnemy,
    updateEnemyPosition: state.updateEnemyPosition,
  })
);

export const useScoreActions = () => useGameStore(
  (state) => ({
    updateScore: state.updateScore,
    setScore: state.setScore,
    updateTime: state.updateTime,
    saveHighScore: state.saveHighScore,
  })
);

export const useAudioActions = () => useGameStore(
  (state) => ({
    toggleSound: state.toggleSound,
    toggleMusic: state.toggleMusic,
    setSoundVolume: state.setSoundVolume,
    setMusicVolume: state.setMusicVolume,
  })
);
