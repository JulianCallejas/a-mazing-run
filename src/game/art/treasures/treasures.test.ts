import { describe, expect, it } from 'vitest';
import { Box3, Group, Mesh, Vector3 } from 'three';
import { TREASURE_KINDS } from '../../core/treasures';
import { buildTreasureModel } from './index';

const meshCount = (root: Group) => {
  let count = 0;
  root.traverse((object) => {
    if (object instanceof Mesh) count++;
  });
  return count;
};

describe('buildTreasureModel', () => {
  it.each(TREASURE_KINDS)('builds an animatable, disposable %s', (kind) => {
    const model = buildTreasureModel(kind);
    expect(model.root).toBeInstanceOf(Group);
    expect(meshCount(model.root)).toBeGreaterThan(0);
    expect(model.accent).toMatch(/^#[0-9a-f]{6}$/i);

    expect(() => model.animate(1.25, 0)).not.toThrow();
    expect(model.root.visible).toBe(false);
    expect(() => model.animate(2.5, 1)).not.toThrow();
    expect(model.root.visible).toBe(true);
    expect(() => model.animate(3, 1, 1)).not.toThrow();

    expect(() => model.dispose()).not.toThrow();
  });

  it.each(TREASURE_KINDS)('keeps %s small and above the floor', (kind) => {
    const model = buildTreasureModel(kind);
    model.animate(0.7, 1);
    model.root.updateMatrixWorld(true);
    const size = new Box3().setFromObject(model.root).getSize(new Vector3());
    const box = new Box3().setFromObject(model.root);
    // Fits inside a corridor cell and stays readable next to the 0.8-tall hero.
    expect(Math.max(size.x, size.y, size.z)).toBeLessThan(0.75);
    expect(Math.max(size.x, size.y, size.z)).toBeGreaterThan(0.15);
    expect(box.min.y).toBeGreaterThanOrEqual(-0.001);
    model.dispose();
  });
});
