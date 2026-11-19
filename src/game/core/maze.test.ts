import { describe, expect, it } from 'vitest';
import {
  Cell,
  MAX_MAZE_SIZE,
  MIN_MAZE_SIZE,
  distancesFrom,
  generateMaze,
  isWalkable,
  walkableNeighbors,
} from './maze';

const countCells = (grid: number[][], cell: Cell): number =>
  grid.reduce((total, row) => total + row.filter((value) => value === cell).length, 0);

describe('generateMaze', () => {
  it('builds a grid with the requested dimensions', () => {
    const maze = generateMaze({ width: 21, height: 15, seed: 1 });

    expect(maze.width).toBe(21);
    expect(maze.height).toBe(15);
    expect(maze.grid).toHaveLength(15);
    maze.grid.forEach((row) => expect(row).toHaveLength(21));
  });

  it('clamps sizes to the supported 10..100 range', () => {
    const small = generateMaze({ width: 3, height: 4, seed: 1 });
    const large = generateMaze({ width: 500, height: 101, seed: 1 });

    expect([small.width, small.height]).toEqual([MIN_MAZE_SIZE, MIN_MAZE_SIZE]);
    expect([large.width, large.height]).toEqual([MAX_MAZE_SIZE, MAX_MAZE_SIZE]);
  });

  it('only uses the documented cell codes (0=path, 1=wall, 2=start, 3=exit)', () => {
    const { grid } = generateMaze({ width: 25, height: 25, seed: 7 });
    const allowed = new Set<number>([Cell.Path, Cell.Wall, Cell.Start, Cell.Exit]);

    grid.flat().forEach((value) => expect(allowed.has(value)).toBe(true));
  });

  it('has exactly one start and one exit, both inside the outer wall', () => {
    const maze = generateMaze({ width: 31, height: 31, seed: 42 });

    expect(countCells(maze.grid, Cell.Start)).toBe(1);
    expect(countCells(maze.grid, Cell.Exit)).toBe(1);
    expect(maze.grid[maze.start.z][maze.start.x]).toBe(Cell.Start);
    expect(maze.grid[maze.exit.z][maze.exit.x]).toBe(Cell.Exit);
    for (const point of [maze.start, maze.exit]) {
      expect(point.x).toBeGreaterThan(0);
      expect(point.z).toBeGreaterThan(0);
      expect(point.x).toBeLessThan(maze.width - 1);
      expect(point.z).toBeLessThan(maze.height - 1);
    }
  });

  it('is surrounded by a solid outer wall', () => {
    const { grid, width, height } = generateMaze({ width: 20, height: 16, seed: 3 });

    for (let x = 0; x < width; x++) {
      expect(grid[0][x]).toBe(Cell.Wall);
      expect(grid[height - 1][x]).toBe(Cell.Wall);
    }
    for (let z = 0; z < height; z++) {
      expect(grid[z][0]).toBe(Cell.Wall);
      expect(grid[z][width - 1]).toBe(Cell.Wall);
    }
  });

  it('makes every walkable cell reachable from the start', () => {
    for (const seed of [1, 2, 3, 99, 1234]) {
      const maze = generateMaze({ width: 27, height: 23, seed });
      const distances = distancesFrom(maze.grid, maze.start);

      maze.grid.forEach((row, z) =>
        row.forEach((value, x) => {
          if (value !== Cell.Wall) expect(distances[z][x]).toBeGreaterThanOrEqual(0);
        }),
      );
    }
  });

  it('places the exit on the cell farthest from the start', () => {
    const maze = generateMaze({ width: 25, height: 25, seed: 5, loopFactor: 0 });
    const distances = distancesFrom(maze.grid, maze.start);
    const farthest = Math.max(...distances.flat());

    expect(distances[maze.exit.z][maze.exit.x]).toBe(farthest);
  });

  it('is deterministic for the same seed and differs across seeds', () => {
    const a = generateMaze({ width: 21, height: 21, seed: 11 });
    const b = generateMaze({ width: 21, height: 21, seed: 11 });
    const c = generateMaze({ width: 21, height: 21, seed: 12 });

    expect(a.grid).toEqual(b.grid);
    expect(a.grid).not.toEqual(c.grid);
  });

  it('opens extra loops when loopFactor > 0 so chases are escapable', () => {
    const perfect = generateMaze({ width: 31, height: 31, seed: 8, loopFactor: 0 });
    const braided = generateMaze({ width: 31, height: 31, seed: 8, loopFactor: 0.3 });
    const walkable = (grid: number[][]) => grid.flat().filter((v) => v !== Cell.Wall).length;

    expect(walkable(braided.grid)).toBeGreaterThan(walkable(perfect.grid));
  });

  it('rejects non-finite sizes or loop factors outside 0..1', () => {
    expect(() => generateMaze({ width: Number.NaN, height: 20, seed: 1 })).toThrow(RangeError);
    expect(() => generateMaze({ width: 20, height: 20, seed: 1, loopFactor: 2 })).toThrow(RangeError);
  });
});

describe('grid helpers', () => {
  const grid = [
    [1, 1, 1, 1],
    [1, 2, 0, 1],
    [1, 1, 3, 1],
    [1, 1, 1, 1],
  ];

  it('treats path, start and exit as walkable and walls/out-of-bounds as blocked', () => {
    expect(isWalkable(grid, 1, 1)).toBe(true);
    expect(isWalkable(grid, 2, 1)).toBe(true);
    expect(isWalkable(grid, 2, 2)).toBe(true);
    expect(isWalkable(grid, 0, 0)).toBe(false);
    expect(isWalkable(grid, -1, 1)).toBe(false);
    expect(isWalkable(grid, 9, 9)).toBe(false);
  });

  it('lists only walkable 4-connected neighbors', () => {
    expect(walkableNeighbors(grid, { x: 2, z: 1 })).toEqual(
      expect.arrayContaining([
        { x: 1, z: 1 },
        { x: 2, z: 2 },
      ]),
    );
    expect(walkableNeighbors(grid, { x: 2, z: 1 })).toHaveLength(2);
  });

  it('returns BFS step distances with -1 for unreachable cells', () => {
    const distances = distancesFrom(grid, { x: 1, z: 1 });

    expect(distances[1][1]).toBe(0);
    expect(distances[1][2]).toBe(1);
    expect(distances[2][2]).toBe(2);
    expect(distances[0][0]).toBe(-1);
  });
});
