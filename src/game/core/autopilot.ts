import { FIXED_STEP, type Direction, type GameEngine, type GameStatus } from './engine';
import { findPath } from './pathfinding';

/**
 * Deterministic simulation drivers for QA (test hooks, bots). They feed the
 * engine fixed time steps directly, so results do not depend on frame rate.
 */

/** Advances simulated time until `predicate` is true; false if `maxSeconds` ran out. */
export const advanceUntil = (engine: GameEngine, predicate: () => boolean, maxSeconds: number): boolean => {
  const steps = Math.ceil(maxSeconds / FIXED_STEP);
  for (let i = 0; i < steps; i++) {
    if (predicate()) return true;
    engine.update(FIXED_STEP);
  }
  return predicate();
};

const directionTo = (dx: number, dz: number): Direction =>
  dx > 0 ? 'east' : dx < 0 ? 'west' : dz > 0 ? 'south' : 'north';

/** Walks the shortest path to the exit; returns the final status. */
export const driveToExit = (engine: GameEngine, maxSeconds = 600): GameStatus => {
  if (engine.status === 'ready') engine.start();
  const { grid, exit } = engine.maze;
  advanceUntil(
    engine,
    () => {
      if (engine.status !== 'playing') return true;
      if (!engine.player.moving) {
        const path = findPath(grid, engine.player.to, exit);
        if (path.length >= 2) {
          const direction = directionTo(path[1].x - path[0].x, path[1].z - path[0].z);
          engine.press(direction);
          engine.release(direction);
        }
      }
      return false;
    },
    maxSeconds,
  );
  return engine.status;
};
