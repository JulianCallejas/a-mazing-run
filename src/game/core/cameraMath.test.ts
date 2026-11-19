import { describe, expect, it } from 'vitest';
import { dampAngle, forwardFromYaw, occludedDistance, yawFromDirection } from './cameraMath';
import { mazeFromRows } from './testMaze';

describe('forwardFromYaw / yawFromDirection', () => {
  it('yaw 0 looks north (-z) and quarter turns go clockwise (east = +x)', () => {
    const north = forwardFromYaw(0);
    const east = forwardFromYaw(Math.PI / 2);

    expect(north.x).toBeCloseTo(0);
    expect(north.z).toBeCloseTo(-1);
    expect(east.x).toBeCloseTo(1);
    expect(east.z).toBeCloseTo(0);
  });

  it('returns the model yaw that makes +z face a grid direction', () => {
    expect(yawFromDirection('south')).toBeCloseTo(0);
    expect(yawFromDirection('east')).toBeCloseTo(Math.PI / 2);
    expect(Math.abs(yawFromDirection('north'))).toBeCloseTo(Math.PI);
    expect(yawFromDirection('west')).toBeCloseTo(-Math.PI / 2);
  });
});

describe('dampAngle', () => {
  it('moves toward the target along the shortest arc', () => {
    const next = dampAngle(Math.PI - 0.1, -Math.PI + 0.1, 10, 1 / 60);

    // Shortest arc crosses ±π, so the angle grows past π instead of sweeping back.
    expect(next).toBeGreaterThan(Math.PI - 0.1);
  });

  it('converges to the target and is frame-rate independent', () => {
    let a = 0;
    for (let i = 0; i < 60; i++) a = dampAngle(a, 1, 8, 1 / 60);
    let b = 0;
    for (let i = 0; i < 30; i++) b = dampAngle(b, 1, 8, 1 / 30);

    expect(a).toBeCloseTo(1, 2);
    expect(a).toBeCloseTo(b, 2);
  });
});

describe('occludedDistance', () => {
  const { grid } = mazeFromRows([
    '#######',
    '#.....#',
    '#.###.#',
    '#S...E#',
    '#######',
  ]);

  it('returns the full distance when the ray stays in open cells', () => {
    expect(occludedDistance(grid, { x: 5, z: 3 }, { x: -1, z: 0 }, 3, 0.2)).toBeCloseTo(3, 5);
  });

  it('pulls in before the first wall cell, minus padding', () => {
    // From (1,3) looking south the wall cell z=4 starts at z=3.5.
    const d = occludedDistance(grid, { x: 1, z: 3 }, { x: 0, z: 1 }, 4, 0.2);
    expect(d).toBeGreaterThan(0.2);
    expect(d).toBeLessThanOrEqual(0.3 + 1e-6);
  });

  it('never returns less than the minimum distance', () => {
    expect(occludedDistance(grid, { x: 1, z: 3 }, { x: -1, z: 0 }, 4, 0.5, 0.35)).toBe(0.35);
  });
});
