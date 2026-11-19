import { describe, expect, it } from 'vitest';
import { advanceGait, createGait, gaitPose } from './gait';

const STRIDE = 0.5;

describe('advanceGait', () => {
  it('advances the phase by π per stride travelled (full cycle = two strides)', () => {
    const gait = createGait();
    advanceGait(gait, 0, 0, 1 / 60, STRIDE);
    for (let i = 1; i <= 60; i++) advanceGait(gait, i / 60, 0, 1 / 60, STRIDE);

    expect(gait.phase).toBeCloseTo(2 * Math.PI, 5);
  });

  it('does not advance or blend in while standing still', () => {
    const gait = createGait();
    for (let i = 0; i < 30; i++) advanceGait(gait, 3, 4, 1 / 60, STRIDE);

    expect(gait.phase).toBe(0);
    expect(gait.weight).toBe(0);
  });

  it('blends the walk weight in while moving and out after stopping', () => {
    const gait = createGait();
    for (let i = 0; i <= 30; i++) advanceGait(gait, i * 0.04, 0, 1 / 60, STRIDE);
    const walking = gait.weight;
    for (let i = 0; i < 60; i++) advanceGait(gait, 1.2, 0, 1 / 60, STRIDE);

    expect(walking).toBeGreaterThan(0.9);
    expect(gait.weight).toBeLessThan(0.05);
  });

  it('ignores teleports (respawn/restart) instead of spinning the legs', () => {
    const gait = createGait();
    advanceGait(gait, 0, 0, 1 / 60, STRIDE);
    advanceGait(gait, 20, 20, 1 / 60, STRIDE);

    expect(gait.phase).toBe(0);
  });
});

describe('gaitPose', () => {
  it('is neutral when the walk weight is zero', () => {
    const pose = gaitPose(1.3, 0);
    for (const value of Object.values(pose)) expect(value).toBeCloseTo(0, 10);
  });

  it('swings legs in opposition and arms against their legs', () => {
    const pose = gaitPose(Math.PI / 2, 1);

    expect(pose.leftLeg).toBeCloseTo(1);
    expect(pose.rightLeg).toBeCloseTo(-1);
    expect(pose.leftArm).toBeCloseTo(-1);
    expect(pose.rightArm).toBeCloseTo(1);
  });

  it('only bends knees backward and keeps the bob non-negative', () => {
    for (let phase = 0; phase < Math.PI * 2; phase += 0.1) {
      const pose = gaitPose(phase, 1);
      expect(pose.leftKnee).toBeGreaterThanOrEqual(0);
      expect(pose.rightKnee).toBeGreaterThanOrEqual(0);
      expect(pose.bob).toBeGreaterThanOrEqual(0);
    }
  });
});
