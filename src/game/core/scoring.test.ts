import { describe, expect, it } from 'vitest';
import { calculateScore, formatTime } from './scoring';

describe('calculateScore (S11 formula)', () => {
  it('Easy: 0.9 × (1000/time) + visual_effect_value', () => {
    expect(calculateScore(50, 'EASY', 'NONE')).toBe(18);
    expect(calculateScore(50, 'EASY', 'FOG')).toBe(18 + 179);
  });

  it('Medium: (1000/time) + visual_effect_value', () => {
    expect(calculateScore(40, 'MEDIUM', 'SNOW')).toBe(25 + 163);
  });

  it('Hard: 1.05 × (1000/time) + visual_effect_value', () => {
    expect(calculateScore(10, 'HARD', 'RAIN')).toBe(105 + 147);
  });

  it('Very Hard: 1.1 × (1000/time) + visual_effect_value', () => {
    expect(calculateScore(20, 'VERY_HARD', 'NONE')).toBe(55);
  });

  it('rounds to the nearest integer', () => {
    expect(calculateScore(3, 'MEDIUM', 'NONE')).toBe(333);
  });

  it('rejects non-positive or non-finite times', () => {
    expect(() => calculateScore(0, 'MEDIUM', 'NONE')).toThrow(RangeError);
    expect(() => calculateScore(-5, 'MEDIUM', 'NONE')).toThrow(RangeError);
    expect(() => calculateScore(Number.POSITIVE_INFINITY, 'MEDIUM', 'NONE')).toThrow(RangeError);
  });
});

describe('formatTime', () => {
  it('formats seconds as m:ss', () => {
    expect(formatTime(0)).toBe('0:00');
    expect(formatTime(9.9)).toBe('0:09');
    expect(formatTime(75)).toBe('1:15');
  });
});
