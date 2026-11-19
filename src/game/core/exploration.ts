/** Revealed-cell memory for the minimap's fog of war. */
export interface Exploration {
  width: number;
  height: number;
  cells: Uint8Array;
  revealedCount: number;
}

export const createExploration = (width: number, height: number): Exploration => ({
  width,
  height,
  cells: new Uint8Array(width * height),
  revealedCount: 0,
});

export const isRevealed = (ex: Exploration, x: number, z: number): boolean =>
  x >= 0 && z >= 0 && x < ex.width && z < ex.height && ex.cells[z * ex.width + x] === 1;

/**
 * Reveals every cell whose center lies within `radius` of the (rounded)
 * position. Returns true when at least one new cell was revealed.
 */
export const revealAround = (ex: Exploration, x: number, z: number, radius: number): boolean => {
  const cx = Math.round(x);
  const cz = Math.round(z);
  const r = Math.ceil(radius);
  let changed = false;
  for (let dz = -r; dz <= r; dz++) {
    for (let dx = -r; dx <= r; dx++) {
      if (dx * dx + dz * dz > radius * radius + 1e-9) continue;
      const px = cx + dx;
      const pz = cz + dz;
      if (px < 0 || pz < 0 || px >= ex.width || pz >= ex.height) continue;
      const index = pz * ex.width + px;
      if (ex.cells[index] === 0) {
        ex.cells[index] = 1;
        ex.revealedCount++;
        changed = true;
      }
    }
  }
  return changed;
};
