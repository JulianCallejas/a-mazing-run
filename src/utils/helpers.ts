import { GAME_CONFIG } from './constants';

export const calculateScore = (
  timeInSeconds: number, 
  difficulty: keyof typeof GAME_CONFIG.DIFFICULTY,
  visualEffect: number
): number => {
  const multiplier = GAME_CONFIG.SCORING.MULTIPLIERS[difficulty];
  const baseScore = GAME_CONFIG.SCORING.BASE_SCORE / timeInSeconds;
  return Math.round(multiplier * baseScore + visualEffect);
};

export const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};

export const lerp = (start: number, end: number, progress: number): number => {
  return start + (end - start) * progress;
};

export const distance2D = (x1: number, y1: number, x2: number, y2: number): number => {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
};

export const playSound = (soundName: string, volume: number = 0.5): void => {
  // Mock sound system - replace with actual audio implementation
  console.log(`Playing sound: ${soundName} at volume ${volume}`);
};

export const vibrate = (pattern: number | number[]): void => {
  if ('vibrate' in navigator) {
    navigator.vibrate(pattern);
  }
};