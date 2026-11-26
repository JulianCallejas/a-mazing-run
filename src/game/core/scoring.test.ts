import { describe, expect, it } from 'vitest';
import { calculateScore, formatTime } from './scoring';

describe('calculateScore', () => {
  it('Easy: 1000 × 1.0 × weather / time', () => {
    expect(calculateScore(50, 'EASY', 'NONE')).toBe(20);
    expect(calculateScore(50, 'EASY', 'FOG')).toBe(25);
  });

  it('Medium: 1000 × 1.5 × weather / time', () => {
    expect(calculateScore(40, 'MEDIUM', 'NONE')).toBe(38);
    expect(calculateScore(40, 'MEDIUM', 'SNOW')).toBe(43);
  });

  it('Hard: 1000 × 2.8 × weather / time', () => {
    expect(calculateScore(10, 'HARD', 'NONE')).toBe(280);
    expect(calculateScore(10, 'HARD', 'RAIN')).toBe(302);
  });

  it('Very Hard: 1000 × 3.6 × weather / time', () => {
    expect(calculateScore(20, 'VERY_HARD', 'NONE')).toBe(180);
    expect(calculateScore(20, 'VERY_HARD', 'FOG')).toBe(225);
  });

  it('rounds to the nearest integer', () => {
    expect(calculateScore(3, 'EASY', 'NONE')).toBe(333);
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
