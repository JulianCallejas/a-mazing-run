import { describe, expect, it } from 'vitest';
import { GAME_CONFIG } from '../../utils/constants';
import { createGameEngine, type Direction } from './engine';
import { Cell, generateMaze, walkableNeighbors, type GridPoint } from './maze';
import { findPath } from './pathfinding';
import {
  RARITY_POINTS,
  TREASURE_DEFS,
  placeTreasures,
  treasureBasePoints,
  type TreasureKind,
} from './treasures';

const maze = (size: number, seed: number) => generateMaze({ width: size, height: size, seed });
const key = (p: GridPoint) => `${p.x},${p.z}`;

const directionTo = (from: GridPoint, to: GridPoint): Direction => {
  if (to.x > from.x) return 'east';
  if (to.x < from.x) return 'west';
  return to.z > from.z ? 'south' : 'north';
};

describe('treasure definitions', () => {
  it('defines one rare treasure per weather and seven weather-free ones', () => {
    const byWeather = Object.values(TREASURE_DEFS).filter((d) => d.weather !== null);
    expect(byWeather.map((d) => d.weather).sort()).toEqual(['FOG', 'RAIN', 'SNOW']);
    expect(byWeather.every((d) => d.rarity === 'rare')).toBe(true);
    expect(Object.values(TREASURE_DEFS).filter((d) => d.weather === null)).toHaveLength(7);
  });

  it('values treasures by rarity: 50 / 100 / 250', () => {
    expect(RARITY_POINTS).toEqual({ common: 50, uncommon: 100, rare: 250 });
    expect(treasureBasePoints('moon-shard')).toBe(50);
    expect(treasureBasePoints('rune-stone')).toBe(100);
    expect(treasureBasePoints('key-fragment')).toBe(250);
  });

  it('scales the count with the difficulty (3 / 5 / 7 / 9)', () => {
    const counts = Object.values(GAME_CONFIG.DIFFICULTY).map((d) => d.treasureCount);
    expect(counts).toEqual([3, 5, 7, 9]);
  });
});

describe('placeTreasures', () => {
  const m = maze(21, 7);

  it('is deterministic for a given maze and seed, and varies with the seed', () => {
    expect(placeTreasures(m, 5, 'NONE', 1)).toEqual(placeTreasures(m, 5, 'NONE', 1));
    expect(placeTreasures(m, 5, 'NONE', 1)).not.toEqual(placeTreasures(m, 5, 'NONE', 2));
  });

  it('places the requested number on distinct path cells at every difficulty size', () => {
    for (const [size, count] of [
      [15, 3],
      [21, 5],
      [27, 7],
      [33, 9],
    ] as const) {
      const big = maze(size, size);
      const placed = placeTreasures(big, count, 'NONE', 3);
      expect(placed).toHaveLength(count);
      expect(new Set(placed.map((t) => key(t.cell))).size).toBe(count);
      for (const t of placed) expect(big.grid[t.cell.z][t.cell.x]).toBe(Cell.Path);
    }
  });

  it('hides treasures off the fastest route', () => {
    const route = new Set(findPath(m.grid, m.start, m.exit).map(key));
    for (const t of placeTreasures(m, 5, 'NONE', 11)) expect(route.has(key(t.cell))).toBe(false);
  });

  it('puts the weather treasure in rainy, snowy and foggy mazes only', () => {
    const kinds = (weather: 'NONE' | 'FOG' | 'SNOW' | 'RAIN') =>
      placeTreasures(m, 5, weather, 9).map((t) => t.kind);
    expect(kinds('RAIN')).toContain('raindrop');
    expect(kinds('SNOW')).toContain('frost-flower');
    expect(kinds('FOG')).toContain('mist-wisp');
    const weatherKinds: TreasureKind[] = ['raindrop', 'frost-flower', 'mist-wisp'];
    expect(kinds('NONE').some((k) => weatherKinds.includes(k))).toBe(false);
    expect(kinds('RAIN').filter((k) => k === 'frost-flower' || k === 'mist-wisp')).toEqual([]);
  });

  it('gives the rarest kinds to the most hidden cells', () => {
    const points = placeTreasures(m, 5, 'NONE', 4).map((t) => treasureBasePoints(t.kind));
    expect(points).toEqual([...points].sort((a, b) => b - a));
  });
});

describe('engine treasure pickup', () => {
  const runTo = (kind: TreasureKind) => {
    const m = maze(15, 3);
    const next = walkableNeighbors(m.grid, m.start)[0];
    const engine = createGameEngine({
      maze: m,
      difficulty: 'EASY',
      enemySpawns: [],
      treasures: [{ id: 't0', kind, cell: next }],
    });
    const direction = directionTo(m.start, next);
    engine.start();
    engine.press(direction);
    for (let i = 0; i < 120 && engine.treasuresFound === 0; i++) engine.update(1 / 30);
    return { engine, direction };
  };

  it('collects a treasure when the player reaches its cell, once', () => {
    const { engine, direction } = runTo('bronze-coin');
    expect(engine.treasuresFound).toBe(1);
    expect(engine.treasurePoints).toBe(50);
    expect(engine.treasures[0].collected).toBe(true);
    expect(engine.drainEvents().filter((e) => e.type === 'treasure')).toEqual([
      { type: 'treasure', id: 't0', kind: 'bronze-coin', points: 50 },
    ]);

    engine.release(direction);
    for (let i = 0; i < 30; i++) engine.update(1 / 30);
    expect(engine.drainEvents().filter((e) => e.type === 'treasure')).toEqual([]);
  });

  it('the oil flask brightens the lantern and fades out', () => {
    const { engine } = runTo('oil-flask');
    expect(engine.lanternBoost).toBeGreaterThan(0.9);
    engine.releaseAll();
    for (let i = 0; i < 30 * 12; i++) engine.update(1 / 30);
    expect(engine.lanternBoost).toBe(0);
  });

  it('has no boost without an oil flask', () => {
    const { engine } = runTo('bronze-coin');
    expect(engine.lanternBoost).toBe(0);
  });
});
