import type { Direction } from './engine';
import { DIRECTION_VECTORS } from './engine';
import { Cell, type MazeGrid } from './maze';

export interface Vec2 {
  x: number;
  z: number;
}

/** Camera forward on the ground plane: yaw 0 looks north (-z), +π/2 looks east (+x). */
export const forwardFromYaw = (yaw: number): Vec2 => ({ x: Math.sin(yaw), z: -Math.cos(yaw) });

/** Model rotation.y that turns a mesh's local +z toward a grid direction. */
export const yawFromDirection = (direction: Direction): number => {
  const v = DIRECTION_VECTORS[direction];
  return Math.atan2(v.x, v.z);
};

const wrapPi = (angle: number): number => {
  const twoPi = Math.PI * 2;
  return ((((angle + Math.PI) % twoPi) + twoPi) % twoPi) - Math.PI;
};

/** Frame-rate independent exponential damping along the shortest arc. */
export const dampAngle = (current: number, target: number, lambda: number, dt: number): number =>
  current + wrapPi(target - current) * (1 - Math.exp(-lambda * dt));

/**
 * Marches from `origin` along `direction` (unit vector on the ground plane) and
 * returns how far the camera can go before entering a wall cell, minus
 * `padding`, clamped to [minDistance, maxDistance].
 */
export const occludedDistance = (
  grid: MazeGrid,
  origin: Vec2,
  direction: Vec2,
  maxDistance: number,
  padding: number,
  minDistance = 0.25,
): number => {
  const step = 0.05;
  const samples = Math.ceil(maxDistance / step);
  for (let i = 1; i <= samples; i++) {
    const s = Math.min(i * step, maxDistance);
    const x = Math.round(origin.x + direction.x * s);
    const z = Math.round(origin.z + direction.z * s);
    const blocked = z < 0 || z >= grid.length || x < 0 || x >= grid[z].length || grid[z][x] === Cell.Wall;
    if (blocked) return Math.max(minDistance, s - padding);
  }
  return maxDistance;
};
