import { describe, expect, it } from 'vitest';
import { createGameEngine, CATCH_RADIUS, type GameEvent } from './engine';
import { distancesFrom, generateMaze } from './maze';
import { mazeFromRows } from './testMaze';

const STEP = 0.4;

const corridor = mazeFromRows([
  '#########',
  '#S.....E#',
  '#.#######',
  '#.......#',
  '#########',
]);

/** Advances the engine in small frames, like a 60 fps render loop would. */
const advance = (engine: ReturnType<typeof createGameEngine>, seconds: number) => {
  const frame = 1 / 60;
  for (let t = 0; t < seconds - 1e-9; t += frame) engine.update(frame);
};

const types = (events: GameEvent[]) => events.map((e) => e.type);

const soloEngine = (maze = corridor) =>
  createGameEngine({ maze, difficulty: 'MEDIUM', enemySpawns: [] });

describe('game state machine', () => {
  it('starts in ready, ignores input and time until start()', () => {
    const engine = soloEngine();
    engine.press('east');
    advance(engine, 1);

    expect(engine.status).toBe('ready');
    expect(engine.elapsed).toBe(0);
    expect(engine.player.to).toEqual(corridor.start);
  });

  it('counts time only while playing and freezes everything while paused', () => {
    const engine = soloEngine();
    engine.start();
    advance(engine, 1);
    engine.pause();
    const frozenAt = engine.elapsed;
    const frozenPosition = { ...engine.player.position };
    advance(engine, 2);

    expect(engine.status).toBe('paused');
    expect(engine.elapsed).toBeCloseTo(frozenAt, 5);
    expect(engine.player.position).toEqual(frozenPosition);

    engine.resume();
    advance(engine, 0.5);
    expect(engine.status).toBe('playing');
    expect(engine.elapsed).toBeCloseTo(frozenAt + 0.5, 1);
  });

  it('clamps huge frame deltas (tab switches) so time cannot jump', () => {
    const engine = soloEngine();
    engine.start();
    engine.update(10);

    expect(engine.elapsed).toBeLessThanOrEqual(0.25 + 1e-9);
  });
});

describe('player grid movement', () => {
  it('moves one tile in 0.4 s and interpolates in between', () => {
    const engine = soloEngine();
    engine.start();
    engine.press('east');
    engine.release('east');
    advance(engine, STEP / 2);

    expect(engine.player.position.x).toBeCloseTo(1.5, 1);
    expect(engine.player.position.z).toBe(1);

    advance(engine, STEP / 2 + 0.02);
    expect(engine.player.to).toEqual({ x: 2, z: 1 });
    expect(engine.player.moving).toBe(false);
    expect(engine.player.position).toEqual({ x: 2, z: 1 });
  });

  it('keeps moving at constant speed while a key is held', () => {
    const engine = soloEngine();
    engine.start();
    engine.press('east');
    advance(engine, STEP * 3 + 0.01);

    expect(engine.player.position.x).toBeCloseTo(4, 1);
    expect(engine.player.moving).toBe(true);
  });

  it('buffers a direction pressed mid-step and applies it at the next tile', () => {
    const engine = soloEngine();
    engine.start();
    engine.press('south');
    engine.release('south');
    advance(engine, STEP / 2);
    engine.press('south');
    engine.release('south');
    advance(engine, STEP * 1.5 + 0.02);

    expect(engine.player.to).toEqual({ x: 1, z: 3 });
  });

  it('reverses instantly when the opposite direction is pressed mid-step', () => {
    const engine = soloEngine();
    engine.start();
    engine.press('east');
    engine.release('east');
    advance(engine, STEP * 0.75);
    engine.press('west');
    engine.release('west');

    expect(engine.player.to).toEqual({ x: 1, z: 1 });
    expect(engine.player.position.x).toBeCloseTo(1.75, 1);
    advance(engine, STEP * 0.75 + 0.02);
    expect(engine.player.position).toEqual({ x: 1, z: 1 });
  });

  it('never enters walls and reports a bump once per fresh press', () => {
    const engine = soloEngine();
    engine.start();
    engine.drainEvents();
    engine.press('north');
    advance(engine, 1);

    expect(engine.player.to).toEqual(corridor.start);
    expect(types(engine.drainEvents())).toEqual(['bump']);
    expect(engine.player.facing).toBe('north');
  });

  it('emits a step event for each tile entered', () => {
    const engine = soloEngine();
    engine.start();
    engine.press('east');
    advance(engine, STEP * 2 + 0.02);
    engine.release('east');

    expect(types(engine.drainEvents()).filter((t) => t === 'step')).toHaveLength(2);
  });

  it('wins when the player reaches the exit and reports the run time', () => {
    const engine = soloEngine();
    engine.start();
    engine.press('east');
    advance(engine, STEP * 6 + 0.05);

    expect(engine.status).toBe('won');
    const won = engine.drainEvents().find((e) => e.type === 'won');
    expect(won).toMatchObject({ type: 'won' });
    expect(won && 'time' in won ? won.time : 0).toBeCloseTo(2.4, 1);
    expect(engine.elapsed).toBeCloseTo(2.4, 1);
  });
});

describe('guardians', () => {
  it('spawns the difficulty enemy count far from the start (by path distance)', () => {
    const maze = generateMaze({ width: 27, height: 27, seed: 21 });
    const distances = distancesFrom(maze.grid, maze.start);
    const maxDistance = Math.max(...distances.flat());

    for (const [difficulty, count] of [
      ['EASY', 1],
      ['MEDIUM', 1],
      ['HARD', 2],
      ['VERY_HARD', 2],
    ] as const) {
      const engine = createGameEngine({ maze, difficulty, seed: 3 });
      expect(engine.enemies).toHaveLength(count);
      for (const enemy of engine.enemies) {
        expect(distances[enemy.to.z][enemy.to.x]).toBeGreaterThanOrEqual(Math.floor(maxDistance / 2));
        expect(enemy.to).not.toEqual(maze.exit);
      }
      if (count === 2) expect(engine.enemies[0].to).not.toEqual(engine.enemies[1].to);
    }
  });

  it('waits for the grace period before hunting', () => {
    const engine = createGameEngine({
      maze: corridor,
      difficulty: 'MEDIUM',
      enemySpawns: [{ x: 7, z: 3 }],
      gracePeriodMs: 1000,
    });
    engine.start();
    advance(engine, 0.9);
    expect(engine.enemies[0].to).toEqual({ x: 7, z: 3 });

    advance(engine, 0.2);
    expect(engine.enemies[0].moving).toBe(true);
  });

  it('chases the player along the shortest path at the difficulty speed', () => {
    const engine = createGameEngine({
      maze: corridor,
      difficulty: 'HARD',
      enemySpawns: [{ x: 7, z: 3 }],
      gracePeriodMs: 0,
    });
    engine.start();
    advance(engine, 0.75);

    // HARD guardians move at 100% of player speed: 0.75 s = 1.875 tiles west.
    expect(engine.enemies[0].position.x).toBeCloseTo(5.125, 1);
    expect(engine.enemies[0].position.z).toBe(3);
  });

  it('moves slower on easier difficulties (Easy = 80% speed)', () => {
    const engine = createGameEngine({
      maze: corridor,
      difficulty: 'EASY',
      enemySpawns: [{ x: 7, z: 3 }],
      gracePeriodMs: 0,
    });
    engine.start();
    advance(engine, STEP + 0.02);

    expect(engine.enemies[0].moving).toBe(true);
    expect(engine.enemies[0].to).toEqual({ x: 6, z: 3 });
    expect(engine.enemies[0].position.x).toBeGreaterThan(6);
  });

  it('catches the player when they walk into the guardian', () => {
    const engine = createGameEngine({
      maze: mazeFromRows(['#######', '#S...E#', '#######']),
      difficulty: 'EASY',
      enemySpawns: [{ x: 3, z: 1 }],
      gracePeriodMs: 60_000,
    });
    engine.start();
    engine.press('east');
    advance(engine, STEP * 2);

    expect(engine.status).toBe('lost');
    expect(types(engine.drainEvents())).toContain('lost');
    const gap = Math.abs(engine.player.position.x - engine.enemies[0].position.x);
    expect(gap).toBeLessThan(CATCH_RADIUS + 0.05);
  });

  it('catches the player when the guardian reaches them', () => {
    const engine = createGameEngine({
      maze: corridor,
      difficulty: 'VERY_HARD',
      enemySpawns: [{ x: 5, z: 3 }],
      gracePeriodMs: 0,
    });
    engine.start();
    advance(engine, 5);

    expect(engine.status).toBe('lost');
  });

  it('stops simulating after the run ends', () => {
    const engine = soloEngine();
    engine.start();
    engine.press('east');
    advance(engine, 3);
    const time = engine.elapsed;
    advance(engine, 1);

    expect(engine.status).toBe('won');
    expect(engine.elapsed).toBe(time);
  });
});
