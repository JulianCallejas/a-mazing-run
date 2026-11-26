import { GAME_CONFIG } from '../../utils/constants';

export type Difficulty = keyof typeof GAME_CONFIG.DIFFICULTY;
export type VisualEffect = keyof typeof GAME_CONFIG.VISUAL_EFFECTS;

/**
 * Score for a winning run:
 * round(1000 × difficultyMultiplier × weatherMultiplier × efficiency)
 * + round(treasureBasePoints × difficultyMultiplier × weatherMultiplier), where
 * efficiency = optimalTime / time (capped at 1) compares the run against the
 * fastest possible escape of that very maze, so maze luck cancels out.
 * Detours to collect treasures lower efficiency, which is the trade-off.
 */
export const calculateScore = (
  timeInSeconds: number,
  optimalTimeInSeconds: number,
  difficulty: Difficulty,
  visualEffect: VisualEffect,
  treasureBasePoints = 0,
): number => {
  if (!Number.isFinite(treasureBasePoints) || treasureBasePoints < 0) {
    throw new RangeError('Treasure points must be a non-negative, finite number');
  }
  if (!Number.isFinite(timeInSeconds) || timeInSeconds <= 0) {
    throw new RangeError('Run time must be a positive, finite number of seconds');
  }
  if (!Number.isFinite(optimalTimeInSeconds) || optimalTimeInSeconds <= 0) {
    throw new RangeError('Optimal time must be a positive, finite number of seconds');
  }
  const efficiency = Math.min(1, optimalTimeInSeconds / timeInSeconds);
  const multiplier = GAME_CONFIG.SCORING.MULTIPLIERS[difficulty];
  const weatherMultiplier = GAME_CONFIG.VISUAL_EFFECTS[visualEffect].multiplier;
  const escape = Math.round(GAME_CONFIG.SCORING.BASE_SCORE * multiplier * weatherMultiplier * efficiency);
  return escape + Math.round(treasureBasePoints * multiplier * weatherMultiplier);
};

export const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};
