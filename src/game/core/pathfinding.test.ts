import { describe, expect, it } from 'vitest';
import { findPath } from './pathfinding';
import { generateMaze, distancesFrom } from './maze';
import { mazeFromRows } from './testMaze';

describe('findPath (A*)', () => {
  const { grid } = mazeFromRows([
    '#######',
    '#S....#',
    '#####.#',
    '#E....#',
    '#######',
  ]);

  it('returns the shortest walkable path including both ends', () => {
    const path = findPath(grid, { x: 1, z: 1 }, { x: 1, z: 3 });

    expect(path[0]).toEqual({ x: 1, z: 1 });
    expect(path[path.length - 1]).toEqual({ x: 1, z: 3 });
    expect(path).toHaveLength(11);
    for (let i = 1; i < path.length; i++) {
      const step = Math.abs(path[i].x - path[i - 1].x) + Math.abs(path[i].z - path[i - 1].z);
      expect(step).toBe(1);
      expect(grid[path[i].z][path[i].x]).not.toBe(1);
    }
  });

  it('returns just the start when start equals goal', () => {
    expect(findPath(grid, { x: 3, z: 1 }, { x: 3, z: 1 })).toEqual([{ x: 3, z: 1 }]);
  });

  it('returns an empty path when the goal is a wall, out of bounds or unreachable', () => {
    expect(findPath(grid, { x: 1, z: 1 }, { x: 0, z: 0 })).toEqual([]);
    expect(findPath(grid, { x: 1, z: 1 }, { x: 99, z: 1 })).toEqual([]);

    const split = mazeFromRows(['#####', '#S#E#', '#####']).grid;
    expect(findPath(split, { x: 1, z: 1 }, { x: 3, z: 1 })).toEqual([]);
  });

  it('matches BFS distance on generated mazes with loops', () => {
    for (const seed of [4, 8, 15]) {
      const maze = generateMaze({ width: 33, height: 33, seed, loopFactor: 0.2 });
      const distances = distancesFrom(maze.grid, maze.start);
      const path = findPath(maze.grid, maze.start, maze.exit);

      expect(path.length - 1).toBe(distances[maze.exit.z][maze.exit.x]);
    }
  });
});
