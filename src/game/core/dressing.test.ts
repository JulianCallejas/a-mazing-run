import { describe, expect, it } from 'vitest';
import { dressMaze } from './dressing';
import { DIRECTION_VECTORS } from './engine';
import { Cell, generateMaze, isWalkable } from './maze';

const maze = generateMaze({ width: 27, height: 27, seed: 77 });

describe('dressMaze torches', () => {
  const { torches } = dressMaze(maze);

  it('mounts every torch on a wall face that looks into a walkable cell', () => {
    expect(torches.length).toBeGreaterThan(5);
    for (const torch of torches) {
      const v = DIRECTION_VECTORS[torch.facing];
      expect(maze.grid[torch.wall.z][torch.wall.x]).toBe(Cell.Wall);
      expect(torch.cell).toEqual({ x: torch.wall.x + v.x, z: torch.wall.z + v.z });
      expect(isWalkable(maze.grid, torch.cell.x, torch.cell.z)).toBe(true);
      expect(torch.x).toBeCloseTo(torch.wall.x + v.x * 0.5);
      expect(torch.z).toBeCloseTo(torch.wall.z + v.z * 0.5);
    }
  });

  it('keeps lit cells at least `torchSpacing` apart', () => {
    const spaced = dressMaze(maze, { torchSpacing: 5 }).torches;
    for (let i = 0; i < spaced.length; i++) {
      for (let j = i + 1; j < spaced.length; j++) {
        const dx = spaced[i].cell.x - spaced[j].cell.x;
        const dz = spaced[i].cell.z - spaced[j].cell.z;
        expect(Math.hypot(dx, dz)).toBeGreaterThanOrEqual(5);
      }
    }
  });

  it('always lights the start and the exit areas', () => {
    const near = (p: { x: number; z: number }) =>
      torches.some((t) => Math.hypot(t.cell.x - p.x, t.cell.z - p.z) <= 1.01);
    expect(near(maze.start)).toBe(true);
    expect(near(maze.exit)).toBe(true);
  });

  it('is deterministic for the same maze', () => {
    expect(dressMaze(maze)).toEqual(dressMaze(maze));
  });
});

describe('dressMaze rubble', () => {
  const { rubble } = dressMaze(maze, { rubbleChance: 0.6 });

  it('only scatters small stones inside walkable cells, never on start or exit', () => {
    expect(rubble.length).toBeGreaterThan(10);
    for (const stone of rubble) {
      const cx = Math.round(stone.x);
      const cz = Math.round(stone.z);
      expect(maze.grid[cz][cx]).toBe(Cell.Path);
      expect(Math.abs(stone.x - cx)).toBeLessThanOrEqual(0.46);
      expect(Math.abs(stone.z - cz)).toBeLessThanOrEqual(0.46);
      expect(stone.scale).toBeGreaterThan(0);
      expect(stone.scale).toBeLessThanOrEqual(0.2);
    }
  });

  it('keeps stones against the walls, away from the walking line', () => {
    for (const stone of rubble) {
      const offX = Math.abs(stone.x - Math.round(stone.x));
      const offZ = Math.abs(stone.z - Math.round(stone.z));
      expect(Math.max(offX, offZ)).toBeGreaterThanOrEqual(0.25);
    }
  });
});

describe('dressMaze battlements', () => {
  it('places merlon pairs on wall edges that overlook a walkable cell', () => {
    const { merlons } = dressMaze(maze);
    expect(merlons.length).toBeGreaterThan(50);
    expect(merlons.length % 2).toBe(0);
    for (const merlon of merlons) {
      const v = DIRECTION_VECTORS[merlon.facing];
      const wx = Math.round(merlon.x - v.x * 0.38);
      const wz = Math.round(merlon.z - v.z * 0.38);
      expect(maze.grid[wz][wx]).toBe(Cell.Wall);
      expect(isWalkable(maze.grid, wx + v.x, wz + v.z)).toBe(true);
    }
  });
});

describe('dressMaze perimeter', () => {
  it('scatters trees and rocks only outside the maze footprint', () => {
    const { perimeter } = dressMaze(maze);
    expect(perimeter.length).toBeGreaterThan(40);
    for (const prop of perimeter) {
      const outsideX = prop.x < -2 || prop.x > maze.width + 1;
      const outsideZ = prop.z < -2 || prop.z > maze.height + 1;
      expect(outsideX || outsideZ).toBe(true);
      expect(['tree', 'rock']).toContain(prop.kind);
    }
  });
});

describe('dressMaze exit gate', () => {
  it('faces the exit toward its open neighbour', () => {
    const { exitGate } = dressMaze(maze);
    const v = DIRECTION_VECTORS[exitGate.facing];

    expect(exitGate.cell).toEqual(maze.exit);
    expect(isWalkable(maze.grid, maze.exit.x + v.x, maze.exit.z + v.z)).toBe(true);
  });
});
