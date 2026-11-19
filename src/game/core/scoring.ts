import { GAME_CONFIG } from '../../utils/constants';

export type Difficulty = keyof typeof GAME_CONFIG.DIFFICULTY;
export type VisualEffect = keyof typeof GAME_CONFIG.VISUAL_EFFECTS;

/**
 * Score for a winning run:
 * multiplier(difficulty) × (1000 / timeInSeconds) + visualEffectValue, rounded.
 */
export const calculateScore = (
  timeInSeconds: number,
  difficulty: Difficulty,
  visualEffect: VisualEffect,
): number => {
  if (!Number.isFinite(timeInSeconds) || timeInSeconds <= 0) {
    throw new RangeError('Run time must be a positive, finite number of seconds');
  }
  const multiplier = GAME_CONFIG.SCORING.MULTIPLIERS[difficulty];
  const effectValue = GAME_CONFIG.VISUAL_EFFECTS[visualEffect].value;
  return Math.round(multiplier * (GAME_CONFIG.SCORING.BASE_SCORE / timeInSeconds) + effectValue);
};

export const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};
