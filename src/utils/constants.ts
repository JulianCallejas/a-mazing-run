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
      enemyCount: 1,
      speedMultiplier: 0.8,
      gracePeriod: 2000
    },
    MEDIUM: {
      name: 'Medium', 
      enemyCount: 1,
      speedMultiplier: 0.9,
      gracePeriod: 1500
    },
    HARD: {
      name: 'Hard',
      enemyCount: 2,
      speedMultiplier: 1.0,
      gracePeriod: 1000
    },
    VERY_HARD: {
      name: 'Very Hard',
      enemyCount: 2,
      speedMultiplier: 1.1,
      gracePeriod: 500
    }
  },
  
  VISUAL_EFFECTS: {
    NONE: { name: 'None', value: 0 },
    FOG: { name: 'Fog', value: 179 },
    SNOW: { name: 'Snow', value: 163 },
    RAIN: { name: 'Rain', value: 147 }
  },
  
  SCORING: {
    BASE_SCORE: 1000,
    MULTIPLIERS: {
      EASY: 0.9,
      MEDIUM: 1.0,
      HARD: 1.05,
      VERY_HARD: 1.1
    }
  }
};

export const MAZE_CELLS = {
  WALL: 1,
  PATH: 0,
  START: 2,
  EXIT: 3
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