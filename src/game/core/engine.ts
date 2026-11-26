import { GAME_CONFIG } from '../../utils/constants';
import { Cell, distancesFrom, isWalkable, type GridPoint, type Maze } from './maze';
import { findPath } from './pathfinding';
import { createRandom, shuffle } from './random';
import type { Difficulty } from './scoring';

export type Direction = 'north' | 'east' | 'south' | 'west';

export const DIRECTION_VECTORS: Readonly<Record<Direction, GridPoint>> = {
  north: { x: 0, z: -1 },
  east: { x: 1, z: 0 },
  south: { x: 0, z: 1 },
  west: { x: -1, z: 0 },
};

export const OPPOSITE_DIRECTION: Readonly<Record<Direction, Direction>> = {
  north: 'south',
  east: 'west',
  south: 'north',
  west: 'east',
};

/** Fastest possible escape: shortest path length × the player's step duration. */
export const optimalRunTime = (maze: Maze): number =>
  distancesFrom(maze.grid, maze.start)[maze.exit.z][maze.exit.x] * PLAYER_STEP_DURATION;

export type GameStatus = 'ready' | 'playing' | 'paused' | 'won' | 'lost';

export type GameEvent =
  | { type: 'step' }
  | { type: 'bump' }
  /** Guardians start hunting (grace period over). Emitted once per run. */
  | { type: 'awaken' }
  | { type: 'won'; time: number }
  | { type: 'lost'; time: number };

/** A grid-bound character. `position` is the interpolated world-grid position. */
export interface Actor {
  readonly id: string;
  from: GridPoint;
  to: GridPoint;
  /** 0..1 progress of the current step from `from` to `to`. */
  progress: number;
  moving: boolean;
  facing: Direction;
  stepDuration: number;
  position: { x: number; z: number };
}

export interface GameEngineOptions {
  maze: Maze;
  difficulty: Difficulty;
  /** Seed for guardian placement; defaults to a value derived from the maze seed. */
  seed?: number;
  /** Explicit guardian spawn cells (tests, scripted levels). */
  enemySpawns?: GridPoint[];
  /** Overrides the difficulty grace period before guardians start hunting. */
  gracePeriodMs?: number;
}

/** Distance (in tiles) at which a guardian catches the player. */
export const CATCH_RADIUS = 0.6;
/** Simulation runs at a fixed 60 Hz, independent of render frame rate. */
export const FIXED_STEP = 1 / 60;
/** Longest frame consumed at once, so a background tab cannot skip the game ahead. */
export const MAX_FRAME_DELTA = 0.25;
export const PLAYER_STEP_DURATION = GAME_CONFIG.MOVEMENT.DURATION;

const EPSILON = 1e-9;

const directionBetween = (from: GridPoint, to: GridPoint): Direction => {
  if (to.x > from.x) return 'east';
  if (to.x < from.x) return 'west';
  if (to.z > from.z) return 'south';
  return 'north';
};

const createActor = (id: string, cell: GridPoint, stepDuration: number): Actor => ({
  id,
  from: { ...cell },
  to: { ...cell },
  progress: 0,
  moving: false,
  facing: 'south',
  stepDuration,
  position: { x: cell.x, z: cell.z },
});

const syncPosition = (actor: Actor): void => {
  actor.position.x = actor.from.x + (actor.to.x - actor.from.x) * actor.progress;
  actor.position.z = actor.from.z + (actor.to.z - actor.from.z) * actor.progress;
};

/** Picks guardian spawns at least half the maximum path distance away from the start. */
const pickEnemySpawns = (maze: Maze, count: number, seed: number): GridPoint[] => {
  const distances = distancesFrom(maze.grid, maze.start);
  const cells: Array<GridPoint & { distance: number }> = [];
  distances.forEach((row, z) =>
    row.forEach((distance, x) => {
      if (distance > 0 && maze.grid[z][x] === Cell.Path) cells.push({ x, z, distance });
    }),
  );
  const maxDistance = Math.max(0, ...cells.map((c) => c.distance));
  const minDistance = Math.floor(maxDistance / 2);

  const random = createRandom(seed);
  const far = shuffle(
    cells.filter((c) => c.distance >= minDistance),
    random,
  );
  const fallback = [...cells].sort((a, b) => b.distance - a.distance);
  const chosen: GridPoint[] = [];
  for (const cell of [...far, ...fallback]) {
    if (chosen.length === count) break;
    if (!chosen.some((c) => c.x === cell.x && c.z === cell.z)) chosen.push({ x: cell.x, z: cell.z });
  }
  return chosen;
};

/**
 * Creates the pure game simulation. Rendering reads `player`/`enemies` every
 * frame (they are mutated in place, no allocations) and feeds real time to
 * `update(dt)`; the engine advances in fixed steps.
 */
export const createGameEngine = (options: GameEngineOptions) => {
  const { maze, difficulty } = options;
  const config = GAME_CONFIG.DIFFICULTY[difficulty];
  const gracePeriod = (options.gracePeriodMs ?? config.gracePeriod) / 1000;
  const enemyStep = PLAYER_STEP_DURATION / config.speedMultiplier;

  const player = createActor('player', maze.start, PLAYER_STEP_DURATION);
  const spawns =
    options.enemySpawns ?? pickEnemySpawns(maze, config.enemyCount, options.seed ?? maze.seed + 1);
  const enemies = spawns.map((cell, i) => createActor(`guardian-${i}`, cell, enemyStep));

  let status: GameStatus = 'ready';
  let elapsed = 0;
  let accumulator = 0;
  let awakened = false;
  let queued: Direction | null = null;
  const held: Direction[] = [];
  const events: GameEvent[] = [];

  /** Starts a step from the actor's current tile; returns false when blocked. */
  const beginMove = (actor: Actor, direction: Direction): boolean => {
    actor.facing = direction;
    const v = DIRECTION_VECTORS[direction];
    const target = { x: actor.to.x + v.x, z: actor.to.z + v.z };
    if (!isWalkable(maze.grid, target.x, target.z)) return false;
    actor.from = { ...actor.to };
    actor.to = target;
    actor.progress = 0;
    actor.moving = true;
    return true;
  };

  /** Advances a moving actor; returns leftover seconds on arrival, or -1. */
  const advance = (actor: Actor, dt: number): number => {
    actor.progress += dt / actor.stepDuration;
    if (actor.progress < 1 - EPSILON) {
      syncPosition(actor);
      return -1;
    }
    const leftover = Math.max(0, (actor.progress - 1) * actor.stepDuration);
    actor.from = { ...actor.to };
    actor.progress = 0;
    actor.moving = false;
    syncPosition(actor);
    return leftover;
  };

  /** Applies carried-over time so chained steps keep a constant speed. */
  const carry = (actor: Actor, leftover: number): void => {
    if (actor.moving && leftover > 0) {
      actor.progress = leftover / actor.stepDuration;
      syncPosition(actor);
    }
  };

  const finish = (result: 'won' | 'lost', time: number): void => {
    status = result;
    elapsed = time;
    events.push({ type: result, time });
  };

  const continuePlayer = (leftover: number): void => {
    const fromQueue = queued !== null;
    const direction = queued ?? held[held.length - 1];
    queued = null;
    if (!direction) return;
    if (beginMove(player, direction)) carry(player, leftover);
    else if (fromQueue) events.push({ type: 'bump' });
  };

  const tickPlayer = (dt: number): void => {
    if (!player.moving) {
      continuePlayer(0);
      return;
    }
    const leftover = advance(player, dt);
    if (leftover < 0) return;
    events.push({ type: 'step' });
    if (maze.grid[player.to.z][player.to.x] === Cell.Exit) {
      finish('won', elapsed - leftover);
      return;
    }
    continuePlayer(leftover);
  };

  const tickEnemy = (enemy: Actor, dt: number): void => {
    let leftover = 0;
    if (enemy.moving) {
      leftover = advance(enemy, dt);
      if (leftover < 0) return;
    }
    const path = findPath(maze.grid, enemy.to, player.to);
    if (path.length >= 2 && beginMove(enemy, directionBetween(enemy.to, path[1]))) {
      carry(enemy, leftover);
    }
  };

  const tick = (dt: number): void => {
    elapsed += dt;
    tickPlayer(dt);
    if (status !== 'playing') return;

    const hunting = elapsed >= gracePeriod - EPSILON;
    if (hunting && !awakened && enemies.length > 0) {
      awakened = true;
      events.push({ type: 'awaken' });
    }
    for (const enemy of enemies) {
      if (hunting) tickEnemy(enemy, dt);
      const dx = enemy.position.x - player.position.x;
      const dz = enemy.position.z - player.position.z;
      if (dx * dx + dz * dz < CATCH_RADIUS * CATCH_RADIUS) {
        finish('lost', elapsed);
        return;
      }
    }
  };

  return {
    maze,
    difficulty,
    player: player as Readonly<Actor>,
    enemies: enemies as ReadonlyArray<Readonly<Actor>>,

    get status(): GameStatus {
      return status;
    },
    /** Seconds of active play (excludes ready and paused time). */
    get elapsed(): number {
      return elapsed;
    },

    start(): void {
      if (status === 'ready') status = 'playing';
    },
    pause(): void {
      if (status === 'playing') {
        status = 'paused';
        held.length = 0;
        queued = null;
      }
    },
    resume(): void {
      if (status === 'paused') status = 'playing';
    },

    /** A direction key went down. Starts, buffers or reverses movement. */
    press(direction: Direction): void {
      if (status !== 'playing') return;
      const existing = held.indexOf(direction);
      if (existing >= 0) held.splice(existing, 1);
      held.push(direction);

      if (!player.moving) {
        queued = null;
        if (!beginMove(player, direction)) events.push({ type: 'bump' });
        return;
      }
      if (direction === OPPOSITE_DIRECTION[player.facing]) {
        const { from, to } = player;
        player.from = to;
        player.to = from;
        player.progress = 1 - player.progress;
        player.facing = direction;
        queued = null;
        syncPosition(player);
        return;
      }
      queued = direction;
    },

    release(direction: Direction): void {
      const index = held.indexOf(direction);
      if (index >= 0) held.splice(index, 1);
    },

    releaseAll(): void {
      held.length = 0;
    },

    /** Feeds real frame time; the simulation advances in fixed steps. */
    update(frameDelta: number): void {
      if (status !== 'playing' || !(frameDelta > 0)) return;
      accumulator += Math.min(frameDelta, MAX_FRAME_DELTA);
      while (accumulator >= FIXED_STEP - EPSILON && status === 'playing') {
        accumulator -= FIXED_STEP;
        tick(FIXED_STEP);
      }
    },

    /** Returns and clears the events produced since the last call. */
    drainEvents(): GameEvent[] {
      return events.splice(0, events.length);
    },
  };
};

export type GameEngine = ReturnType<typeof createGameEngine>;
