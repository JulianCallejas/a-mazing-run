import { Cell, distancesFrom, walkableNeighbors, type GridPoint, type Maze } from './maze';
import { findPath } from './pathfinding';
import { createRandom, shuffle } from './random';
import type { VisualEffect } from './scoring';

export type TreasureKind =
  | 'moon-shard'
  | 'bronze-coin'
  | 'rune-stone'
  | 'oil-flask'
  | 'guardian-seal'
  | 'lore-scroll'
  | 'key-fragment'
  | 'raindrop'
  | 'frost-flower'
  | 'mist-wisp';

export type Rarity = 'common' | 'uncommon' | 'rare';

/** Base points per rarity, before the difficulty and weather multipliers. */
export const RARITY_POINTS: Readonly<Record<Rarity, number>> = {
  common: 50,
  uncommon: 100,
  rare: 250,
};

export interface TreasureDef {
  name: string;
  rarity: Rarity;
  /** Only placed in mazes with this weather; null = any weather. */
  weather: VisualEffect | null;
}

export const TREASURE_DEFS: Readonly<Record<TreasureKind, TreasureDef>> = {
  'moon-shard': { name: 'Moon shard', rarity: 'common', weather: null },
  'bronze-coin': { name: 'Bronze coin', rarity: 'common', weather: null },
  'rune-stone': { name: 'Rune stone', rarity: 'uncommon', weather: null },
  'oil-flask': { name: 'Lantern oil', rarity: 'uncommon', weather: null },
  'guardian-seal': { name: 'Guardian seal', rarity: 'rare', weather: null },
  'lore-scroll': { name: 'Lore scroll', rarity: 'rare', weather: null },
  'key-fragment': { name: 'Golden key fragment', rarity: 'rare', weather: null },
  raindrop: { name: 'Raindrop pearl', rarity: 'rare', weather: 'RAIN' },
  'frost-flower': { name: 'Frost flower', rarity: 'rare', weather: 'SNOW' },
  'mist-wisp': { name: 'Mist wisp', rarity: 'rare', weather: 'FOG' },
};

export const TREASURE_KINDS = Object.keys(TREASURE_DEFS) as TreasureKind[];

/** Kinds that can appear in any weather. */
const BASE_KINDS = TREASURE_KINDS.filter((kind) => TREASURE_DEFS[kind].weather === null);

const WEATHER_KIND: Partial<Record<VisualEffect, TreasureKind>> = {
  RAIN: 'raindrop',
  SNOW: 'frost-flower',
  FOG: 'mist-wisp',
};

export interface Treasure {
  id: string;
  kind: TreasureKind;
  cell: GridPoint;
}

export const treasureBasePoints = (kind: TreasureKind): number => RARITY_POINTS[TREASURE_DEFS[kind].rarity];

/** Seconds the oil flask keeps the lantern brighter. */
export const LANTERN_BOOST_SECONDS = 8;

const MIN_START_DISTANCE = 6;
const MIN_EXIT_DISTANCE = 4;
const MIN_SPACING = 5;

interface Candidate {
  cell: GridPoint;
  /** How hidden the cell is: detour length off the fastest route, plus a dead-end bonus. */
  hidden: number;
}

/** Steps from each cell to the nearest cell of `sources` (unreachable cells are -1). */
const distancesFromSet = (maze: Maze, sources: GridPoint[]): number[][] => {
  const distances = maze.grid.map((row) => row.map(() => -1));
  const queue: GridPoint[] = [];
  for (const source of sources) {
    distances[source.z][source.x] = 0;
    queue.push(source);
  }
  for (let head = 0; head < queue.length; head++) {
    const current = queue[head];
    for (const next of walkableNeighbors(maze.grid, current)) {
      if (distances[next.z][next.x] === -1) {
        distances[next.z][next.x] = distances[current.z][current.x] + 1;
        queue.push(next);
      }
    }
  }
  return distances;
};

const manhattan = (a: GridPoint, b: GridPoint) => Math.abs(a.x - b.x) + Math.abs(a.z - b.z);

/**
 * Hides `count` treasures in the maze. Cells off the fastest route (dead ends
 * first) are preferred, spaced apart and away from start and exit; the rarest
 * kinds go to the most hidden cells. Deterministic for a given maze and seed.
 */
export const placeTreasures = (maze: Maze, count: number, weather: VisualEffect, seed: number): Treasure[] => {
  const random = createRandom(seed);
  const route = findPath(maze.grid, maze.start, maze.exit);
  const offRoute = distancesFromSet(maze, route);
  const fromStart = distancesFrom(maze.grid, maze.start);
  const fromExit = distancesFrom(maze.grid, maze.exit);

  const collect = (minStart: number, minExit: number): Candidate[] => {
    const found: Candidate[] = [];
    maze.grid.forEach((row, z) =>
      row.forEach((value, x) => {
        if (value !== Cell.Path || offRoute[z][x] < 1) return;
        if (fromStart[z][x] < minStart || fromExit[z][x] < minExit) return;
        const deadEnd = walkableNeighbors(maze.grid, { x, z }).length === 1;
        found.push({ cell: { x, z }, hidden: offRoute[z][x] + (deadEnd ? 3 : 0) });
      }),
    );
    return found;
  };

  let candidates = collect(MIN_START_DISTANCE, MIN_EXIT_DISTANCE);
  if (candidates.length < count) candidates = collect(2, 2);

  // Mostly the hidden cells, with enough noise that runs differ.
  const ranked = candidates
    .map((candidate) => ({ candidate, key: candidate.hidden + random() * 4 }))
    .sort((a, b) => b.key - a.key)
    .map((entry) => entry.candidate);

  let picked: Candidate[] = [];
  for (let spacing = MIN_SPACING; spacing >= 0; spacing--) {
    picked = [];
    for (const candidate of ranked) {
      if (picked.length === count) break;
      if (picked.every((p) => manhattan(p.cell, candidate.cell) >= spacing)) picked.push(candidate);
    }
    if (picked.length === count) break;
  }

  const total = picked.length;
  const kinds: TreasureKind[] = [];
  const weatherKind = WEATHER_KIND[weather];
  if (weatherKind && total >= 3) kinds.push(weatherKind);
  const pool = shuffle([...BASE_KINDS], random);
  for (let i = 0; kinds.length < total; i++) kinds.push(pool[i % pool.length]);

  kinds.sort((a, b) => treasureBasePoints(b) - treasureBasePoints(a));
  const cells = [...picked].sort((a, b) => b.hidden - a.hidden);

  return cells.map((candidate, index) => ({
    id: `treasure-${index}`,
    kind: kinds[index],
    cell: { ...candidate.cell },
  }));
};
