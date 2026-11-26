// Game constants
export const GAME_CONFIG = {
  COLORS: {
    PRIMARY: '#533324',
    SECONDARY: '#B64362', 
    ACCENT: '#84548C',
    GOLD: '#D4AF37',
    LIGHT_BROWN: '#8B4513',
    DARK_BROWN: '#2F1B14'
  },
  
  MAZE: {
    WALL_HEIGHT: 2,
    WALL_WIDTH: 1,
    WALL_DEPTH: 1,
    CELL_SIZE: 1,
    MIN_SIZE: 10,
    MAX_SIZE: 100
  },
  
  MOVEMENT: {
    DURATION: 0.4,
    PLAYER_SPEED: 1
  },
  
  DIFFICULTY: {
    EASY: {
      name: 'Easy',
      mazeSize: 15,
      enemyCount: 1,
      speedMultiplier: 0.78,
      gracePeriod: 2000
    },
    MEDIUM: {
      name: 'Medium',
      mazeSize: 21,
      enemyCount: 1,
      speedMultiplier: 0.85,
      gracePeriod: 1500
    },
    HARD: {
      name: 'Hard',
      mazeSize: 27,
      enemyCount: 2,
      speedMultiplier: 0.97,
      gracePeriod: 1000
    },
    VERY_HARD: {
      name: 'Very Hard',
      mazeSize: 33,
      enemyCount: 2,
      speedMultiplier: 1.03,
      gracePeriod: 500
    }
  },
  
  VISUAL_EFFECTS: {
    NONE: { name: 'None', multiplier: 1.0 },
    FOG: { name: 'Fog', multiplier: 1.25 },
    SNOW: { name: 'Snow', multiplier: 1.15 },
    RAIN: { name: 'Rain', multiplier: 1.08 }
  },
  
  SCORING: {
    BASE_SCORE: 1000,
    MULTIPLIERS: {
      EASY: 1.0,
      MEDIUM: 1.5,
      HARD: 2.8,
      VERY_HARD: 3.6
    }
  }
};

export const CAMERA_MODES = {
  THIRD_PERSON: 'third-person',
  AERIAL: 'aerial'
};

export const KEYS = {
  W: 'KeyW',
  A: 'KeyA', 
  S: 'KeyS',
  D: 'KeyD',
  ARROW_UP: 'ArrowUp',
  ARROW_DOWN: 'ArrowDown',
  ARROW_LEFT: 'ArrowLeft',
  ARROW_RIGHT: 'ArrowRight',
  C: 'KeyC'
};