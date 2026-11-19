import { createRandom, randomSeed, shuffle } from './random';

/** Cell codes of the maze grid (0=path, 1=wall, 2=start, 3=exit). */
export const Cell = {
  Path: 0,
  Wall: 1,
  Start: 2,
  Exit: 3,
} as const;
export type Cell = (typeof Cell)[keyof typeof Cell];

/** Grid coordinate: `x` is the column, `z` is the row (world Z axis). */
export interface GridPoint {
  x: number;
  z: number;
}

export type MazeGrid = number[][];

export interface Maze {
  grid: MazeGrid;
  width: number;
  height: number;
  start: GridPoint;
  exit: GridPoint;
  seed: number;
}

export interface MazeOptions {
  width: number;
  height: number;
  seed?: number;
  /**
   * Fraction (0..1) of removable inner walls that are opened after carving.
   * Loops let the player escape chasing guardians instead of being trapped in
   * dead ends. 0 produces a perfect maze.
   */
  loopFactor?: number;
}

export const MIN_MAZE_SIZE = 10;
export const MAX_MAZE_SIZE = 100;
export const DEFAULT_LOOP_FACTOR = 0.08;

const DIRECTIONS: readonly GridPoint[] = [
  { x: 0, z: -1 },
  { x: 1, z: 0 },
  { x: 0, z: 1 },
  { x: -1, z: 0 },
];

const clampSize = (value: number): number =>
  Math.min(MAX_MAZE_SIZE, Math.max(MIN_MAZE_SIZE, Math.round(value)));

export const isWalkable = (grid: MazeGrid, x: number, z: number): boolean =>
  z >= 0 && z < grid.length && x >= 0 && x < grid[z].length && grid[z][x] !== Cell.Wall;

export const walkableNeighbors = (grid: MazeGrid, point: GridPoint): GridPoint[] =>
  DIRECTIONS.map((d) => ({ x: point.x + d.x, z: point.z + d.z })).filter((p) =>
    isWalkable(grid, p.x, p.z),
  );

/** Breadth-first step distances from `origin`; unreachable cells are -1. */
export const distancesFrom = (grid: MazeGrid, origin: GridPoint): number[][] => {
  const distances = grid.map((row) => row.map(() => -1));
  if (!isWalkable(grid, origin.x, origin.z)) return distances;

  distances[origin.z][origin.x] = 0;
  const queue: GridPoint[] = [origin];
  for (let head = 0; head < queue.length; head++) {
    const current = queue[head];
    for (const next of walkableNeighbors(grid, current)) {
      if (distances[next.z][next.x] === -1) {
        distances[next.z][next.x] = distances[current.z][current.x] + 1;
        queue.push(next);
      }
    }
  }
  return distances;
};

/**
 * Generates a maze with an iterative recursive-backtracker, optionally braided
 * with extra loops. Rooms live on odd coordinates, so the outer ring is always
 * wall. The start is fixed at (1,1) and the single exit is placed on the
 * walkable cell farthest from it.
 */
export const generateMaze = (options: MazeOptions): Maze => {
  const { loopFactor = DEFAULT_LOOP_FACTOR } = options;
  if (!Number.isFinite(options.width) || !Number.isFinite(options.height)) {
    throw new RangeError('Maze width and height must be finite numbers');
  }
  if (!Number.isFinite(loopFactor) || loopFactor < 0 || loopFactor > 1) {
    throw new RangeError('loopFactor must be between 0 and 1');
  }

  const width = clampSize(options.width);
  const height = clampSize(options.height);
  const seed = options.seed ?? randomSeed();
  const random = createRandom(seed);
  const grid: MazeGrid = Array.from({ length: height }, () => Array<number>(width).fill(Cell.Wall));

  const isRoom = (x: number, z: number) =>
    x > 0 && z > 0 && x < width - 1 && z < height - 1 && x % 2 === 1 && z % 2 === 1;

  const start: GridPoint = { x: 1, z: 1 };
  grid[start.z][start.x] = Cell.Path;
  const stack: GridPoint[] = [start];

  while (stack.length > 0) {
    const current = stack[stack.length - 1];
    const options = shuffle([...DIRECTIONS], random)
      .map((d) => ({ x: current.x + d.x * 2, z: current.z + d.z * 2, d }))
      .filter((n) => isRoom(n.x, n.z) && grid[n.z][n.x] === Cell.Wall);

    if (options.length === 0) {
      stack.pop();
      continue;
    }
    const next = options[0];
    grid[current.z + next.d.z][current.x + next.d.x] = Cell.Path;
    grid[next.z][next.x] = Cell.Path;
    stack.push({ x: next.x, z: next.z });
  }

  if (loopFactor > 0) {
    const removable: GridPoint[] = [];
    for (let z = 1; z < height - 1; z++) {
      for (let x = 1; x < width - 1; x++) {
        if (grid[z][x] !== Cell.Wall) continue;
        const horizontal = isRoom(x - 1, z) && isRoom(x + 1, z);
        const vertical = isRoom(x, z - 1) && isRoom(x, z + 1);
        if (horizontal || vertical) removable.push({ x, z });
      }
    }
    shuffle(removable, random)
      .slice(0, Math.floor(removable.length * loopFactor))
      .forEach(({ x, z }) => {
        grid[z][x] = Cell.Path;
      });
  }

  const distances = distancesFrom(grid, start);
  let exit = start;
  let farthest = -1;
  distances.forEach((row, z) =>
    row.forEach((distance, x) => {
      if (distance > farthest) {
        farthest = distance;
        exit = { x, z };
      }
    }),
  );

  grid[start.z][start.x] = Cell.Start;
  grid[exit.z][exit.x] = Cell.Exit;

  return { grid, width, height, start, exit, seed };
};
