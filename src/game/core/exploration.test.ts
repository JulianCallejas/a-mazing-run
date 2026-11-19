import { describe, expect, it } from 'vitest';
import { createExploration, isRevealed, revealAround } from './exploration';

describe('exploration (minimap fog of war)', () => {
  it('starts fully hidden', () => {
    const ex = createExploration(5, 4);
    expect(ex.revealedCount).toBe(0);
    expect(isRevealed(ex, 2, 2)).toBe(false);
  });

  it('reveals cells within the radius around a point and reports changes', () => {
    const ex = createExploration(9, 9);
    expect(revealAround(ex, 4, 4, 1.5)).toBe(true);

    expect(isRevealed(ex, 4, 4)).toBe(true);
    expect(isRevealed(ex, 5, 5)).toBe(true);
    expect(isRevealed(ex, 6, 4)).toBe(false);
    expect(ex.revealedCount).toBe(9);
    expect(revealAround(ex, 4, 4, 1.5)).toBe(false);
  });

  it('clips at the grid edges and treats out-of-bounds as hidden', () => {
    const ex = createExploration(3, 3);
    revealAround(ex, 0, 0, 2);

    expect(isRevealed(ex, -1, 0)).toBe(false);
    expect(isRevealed(ex, 0, 0)).toBe(true);
    expect(ex.revealedCount).toBeLessThanOrEqual(9);
  });

  it('rounds fractional positions to the nearest cell', () => {
    const ex = createExploration(5, 5);
    revealAround(ex, 2.4, 2.6, 0);

    expect(isRevealed(ex, 2, 3)).toBe(true);
    expect(ex.revealedCount).toBe(1);
  });
});
