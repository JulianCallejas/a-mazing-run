import { describe, expect, it } from 'vitest';
import { advanceUntil, driveToExit } from './autopilot';
import { createGameEngine } from './engine';
import { generateMaze } from './maze';
import { mazeFromRows } from './testMaze';

describe('autopilot (deterministic QA driver)', () => {
  it('walks the shortest path to the exit and wins', () => {
    const maze = mazeFromRows(['#########', '#S.....E#', '#.#######', '#.......#', '#########']);
    const engine = createGameEngine({ maze, difficulty: 'MEDIUM', enemySpawns: [] });

    expect(driveToExit(engine)).toBe('won');
    expect(engine.elapsed).toBeCloseTo(2.4, 1);
  });

  it('wins any generated maze when there are no guardians', () => {
    for (const seed of [1, 2, 3]) {
      const engine = createGameEngine({
        maze: generateMaze({ width: 21, height: 21, seed }),
        difficulty: 'HARD',
        enemySpawns: [],
      });
      expect(driveToExit(engine)).toBe('won');
    }
  });

  it('advances the simulation until a predicate holds, or gives up at the limit', () => {
    const engine = createGameEngine({
      maze: generateMaze({ width: 15, height: 15, seed: 9 }),
      difficulty: 'VERY_HARD',
    });
    engine.start();

    expect(advanceUntil(engine, () => engine.status === 'lost', 120)).toBe(true);
    expect(advanceUntil(engine, () => false, 1)).toBe(false);
  });
});
