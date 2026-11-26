import { describe, expect, it } from 'vitest';
import { calculateScore, formatTime } from './scoring';

describe('calculateScore', () => {
  it('Easy: 1000 × 1.0 × weather × efficiency', () => {
    expect(calculateScore(50, 25, 'EASY', 'NONE')).toBe(500);
    expect(calculateScore(50, 25, 'EASY', 'FOG')).toBe(625);
  });

  it('Medium: 1000 × 1.5 × weather × efficiency', () => {
    expect(calculateScore(40, 20, 'MEDIUM', 'NONE')).toBe(750);
    expect(calculateScore(40, 10, 'MEDIUM', 'SNOW')).toBe(431);
  });

  it('Hard: 1000 × 2.8 × weather × efficiency', () => {
    expect(calculateScore(100, 40, 'HARD', 'NONE')).toBe(1120);
    expect(calculateScore(100, 40, 'HARD', 'RAIN')).toBe(1210);
  });

  it('Very Hard: 1000 × 3.6 × weather × efficiency', () => {
    expect(calculateScore(100, 50, 'VERY_HARD', 'NONE')).toBe(1800);
    expect(calculateScore(100, 50, 'VERY_HARD', 'FOG')).toBe(2250);
  });

  it('a perfect run (time = optimal) scores the full multiplier', () => {
    expect(calculateScore(30, 30, 'HARD', 'NONE')).toBe(2800);
  });

  it('caps efficiency at 1 if the time is somehow below optimal', () => {
    expect(calculateScore(20, 30, 'EASY', 'NONE')).toBe(1000);
  });

  it('is independent of maze luck: the same efficiency gives the same score', () => {
    expect(calculateScore(60, 30, 'MEDIUM', 'NONE')).toBe(calculateScore(120, 60, 'MEDIUM', 'NONE'));
  });

  it('rounds to the nearest integer', () => {
    expect(calculateScore(3, 1, 'EASY', 'NONE')).toBe(333);
  });

  it('adds treasure points scaled by difficulty and weather, on top of the escape score', () => {
    expect(calculateScore(30, 30, 'EASY', 'NONE', 100)).toBe(1100);
    expect(calculateScore(30, 30, 'HARD', 'FOG', 250)).toBe(Math.round(2800 * 1.25) + Math.round(250 * 2.8 * 1.25));
    expect(calculateScore(50, 25, 'EASY', 'NONE', 0)).toBe(calculateScore(50, 25, 'EASY', 'NONE'));
  });

  it('rejects negative or non-finite treasure points', () => {
    expect(() => calculateScore(10, 5, 'EASY', 'NONE', -1)).toThrow(RangeError);
    expect(() => calculateScore(10, 5, 'EASY', 'NONE', Number.NaN)).toThrow(RangeError);
  });

  it('rejects non-positive or non-finite times', () => {
    expect(() => calculateScore(0, 10, 'MEDIUM', 'NONE')).toThrow(RangeError);
    expect(() => calculateScore(-5, 10, 'MEDIUM', 'NONE')).toThrow(RangeError);
    expect(() => calculateScore(Number.POSITIVE_INFINITY, 10, 'MEDIUM', 'NONE')).toThrow(RangeError);
    expect(() => calculateScore(10, 0, 'MEDIUM', 'NONE')).toThrow(RangeError);
    expect(() => calculateScore(10, Number.NaN, 'MEDIUM', 'NONE')).toThrow(RangeError);
  });
});

describe('formatTime', () => {
  it('formats seconds as m:ss', () => {
    expect(formatTime(0)).toBe('0:00');
    expect(formatTime(9.9)).toBe('0:09');
    expect(formatTime(75)).toBe('1:15');
  });
});
