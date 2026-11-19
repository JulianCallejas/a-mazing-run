import { DIRECTION_VECTORS, type Direction } from './engine';
import { Cell, isWalkable, type GridPoint, type Maze } from './maze';
import { createRandom, shuffle } from './random';

/** A wall-mounted torch. `x`/`z` sit on the wall face, `cell` is the lit corridor cell. */
export interface TorchPlacement {
  wall: GridPoint;
  cell: GridPoint;
  facing: Direction;
  x: number;
  z: number;
}

/** A small decorative stone lying against a wall (no collision). */
export interface RubblePlacement {
  x: number;
  z: number;
  scale: number;
  rotation: number;
  /** Stable 0..1 value for tint/shape variation. */
  tint: number;
}

export interface ExitGate {
  cell: GridPoint;
  /** Direction from the exit toward the corridor the player arrives from. */
  facing: Direction;
}

/** A battlement merlon standing on a wall top, on the edge that faces a corridor. */
export interface MerlonPlacement {
  x: number;
  z: number;
  facing: Direction;
}

/** Scenery outside the maze footprint (no gameplay effect). */
export interface PerimeterProp {
  kind: 'tree' | 'rock';
  x: number;
  z: number;
  scale: number;
  rotation: number;
}

export interface MazeDressing {
  torches: TorchPlacement[];
  rubble: RubblePlacement[];
  merlons: MerlonPlacement[];
  perimeter: PerimeterProp[];
  exitGate: ExitGate;
}

export interface DressingOptions {
  /** Minimum distance between lit cells. */
  torchSpacing?: number;
  /** Probability that a corridor cell gets rubble. */
  rubbleChance?: number;
}

const DIRECTIONS: readonly Direction[] = ['north', 'east', 'south', 'west'];

/**
 * Deterministic set dressing for a maze: torch sconces, rubble, battlements,
 * perimeter scenery and the exit gate orientation. Pure data, so it is testable and identical across renders.
 */
export const dressMaze = (maze: Maze, options: DressingOptions = {}): MazeDressing => {
  const { torchSpacing = 4, rubbleChance = 0.3 } = options;
  const { grid, start, exit } = maze;
  const random = createRandom(maze.seed ^ 0x5eed);

  // --- Torches -------------------------------------------------------------
  const candidates: TorchPlacement[] = [];
  grid.forEach((row, z) =>
    row.forEach((cell, x) => {
      if (cell !== Cell.Wall) return;
      for (const facing of DIRECTIONS) {
        const v = DIRECTION_VECTORS[facing];
        const cx = x + v.x;
        const cz = z + v.z;
        if (!isWalkable(grid, cx, cz)) continue;
        candidates.push({
          wall: { x, z },
          cell: { x: cx, z: cz },
          facing,
          x: x + v.x * 0.5,
          z: z + v.z * 0.5,
        });
      }
    }),
  );

  const isKeyCell = (p: GridPoint) =>
    (p.x === start.x && p.z === start.z) || (p.x === exit.x && p.z === exit.z);
  const ordered = [
    ...candidates.filter((c) => isKeyCell(c.cell)),
    ...shuffle(
      candidates.filter((c) => !isKeyCell(c.cell)),
      random,
    ),
  ];

  const torches: TorchPlacement[] = [];
  for (const candidate of ordered) {
    const farEnough = torches.every(
      (t) => Math.hypot(t.cell.x - candidate.cell.x, t.cell.z - candidate.cell.z) >= torchSpacing,
    );
    if (farEnough) torches.push(candidate);
  }

  // --- Rubble ----------------------------------------------------------------
  const rubble: RubblePlacement[] = [];
  grid.forEach((row, z) =>
    row.forEach((cell, x) => {
      if (cell !== Cell.Path || random() >= rubbleChance) return;
      const walls = DIRECTIONS.filter((d) => {
        const v = DIRECTION_VECTORS[d];
        return grid[z + v.z]?.[x + v.x] === Cell.Wall;
      });
      if (walls.length === 0) return;
      const count = 1 + Math.floor(random() * 3);
      for (let i = 0; i < count; i++) {
        const v = DIRECTION_VECTORS[walls[Math.floor(random() * walls.length)]];
        const along = 0.3 + random() * 0.12;
        const across = (random() * 2 - 1) * 0.35;
        rubble.push({
          x: x + v.x * along + (v.x === 0 ? across : 0),
          z: z + v.z * along + (v.z === 0 ? across : 0),
          scale: 0.05 + random() * 0.13,
          rotation: random() * Math.PI * 2,
          tint: random(),
        });
      }
    }),
  );

  // --- Battlements: two merlons on every wall edge that overlooks a corridor ---
  const merlons: MerlonPlacement[] = [];
  grid.forEach((row, z) =>
    row.forEach((cell, x) => {
      if (cell !== Cell.Wall) return;
      for (const facing of DIRECTIONS) {
        const v = DIRECTION_VECTORS[facing];
        if (!isWalkable(grid, x + v.x, z + v.z)) continue;
        for (const along of [-0.25, 0.25]) {
          merlons.push({
            x: x + v.x * 0.38 + (v.x === 0 ? along : 0),
            z: z + v.z * 0.38 + (v.z === 0 ? along : 0),
            facing,
          });
        }
      }
    }),
  );

  // --- Perimeter forest and boulders (separate stream keeps the rest stable) --
  const outer = createRandom(maze.seed ^ 0xf0e57);
  const perimeter: PerimeterProp[] = [];
  const cx = (maze.width - 1) / 2;
  const cz = (maze.height - 1) / 2;
  const half = Math.max(maze.width, maze.height) / 2;
  const count = Math.round(60 + half * 4);
  for (let i = 0; i < count; i++) {
    const angle = outer() * Math.PI * 2;
    const distance = half * 1.42 + 2.5 + outer() ** 1.6 * 26;
    const x = cx + Math.cos(angle) * distance;
    const z = cz + Math.sin(angle) * distance;
    const insideX = x >= -2 && x <= maze.width + 1;
    const insideZ = z >= -2 && z <= maze.height + 1;
    if (insideX && insideZ) continue;
    const kind = outer() < 0.78 ? 'tree' : 'rock';
    perimeter.push({
      kind,
      x,
      z,
      scale: kind === 'tree' ? 0.8 + outer() * 0.9 : 0.4 + outer() * 0.9,
      rotation: outer() * Math.PI * 2,
    });
  }

  // --- Exit gate -------------------------------------------------------------
  const facing =
    DIRECTIONS.find((d) => {
      const v = DIRECTION_VECTORS[d];
      return isWalkable(grid, exit.x + v.x, exit.z + v.z);
    }) ?? 'south';

  return { torches, rubble, merlons, perimeter, exitGate: { cell: { ...exit }, facing } };
};
