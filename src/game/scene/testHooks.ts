import { advanceUntil, driveToExit } from '../core/autopilot';
import type { GameEngine } from '../core/engine';
import type { CameraRigState } from './CameraRig';

const YAW_INDEX = { north: 0, east: 1, south: 2, west: 3 } as const;

/**
 * QA test-hook contract (window.__THREE_GAME_TEST_HOOKS__), enabled only with
 * ?debug. States are reproduced deterministically by driving the simulation
 * with fixed steps; real input is covered separately by the playtest bot.
 */
export const TEST_STATES = ['active-play', 'aerial-map', 'paused', 'danger', 'victory', 'defeat'] as const;
export type TestState = (typeof TEST_STATES)[number];

export const isTestState = (name: string): name is TestState => (TEST_STATES as readonly string[]).includes(name);

/** States that need a run without guardians (so the scripted path is never cut). */
export const runsWithoutGuardians = (state: TestState) => state === 'victory';

const nearestGuardian = (engine: GameEngine) =>
  Math.min(
    ...engine.enemies.map((e) =>
      Math.hypot(e.position.x - engine.player.position.x, e.position.z - engine.player.position.z),
    ),
  );

/**
 * Puts a fresh engine into the requested state, then places the chase camera
 * behind the hero (the autopilot moves in absolute directions, while real
 * third-person play always walks where the camera looks).
 */
export const applyTestState = (engine: GameEngine, state: TestState, rig: CameraRigState): void => {
  const startedAt = { ...engine.player.to };
  driveState(engine, state);
  // Only re-aim when the hero actually walked; otherwise keep the run's initial view.
  const moved = engine.player.to.x !== startedAt.x || engine.player.to.z !== startedAt.z;
  if (moved) rig.yawIndex = YAW_INDEX[engine.player.facing];
};

const driveState = (engine: GameEngine, state: TestState): void => {
  switch (state) {
    case 'active-play':
    case 'aerial-map':
    case 'paused':
      driveToExit(engine, 1.6);
      if (state === 'paused') engine.pause();
      return;
    case 'danger':
      engine.start();
      advanceUntil(engine, () => engine.status !== 'playing' || nearestGuardian(engine) < 2.6, 300);
      return;
    case 'victory':
      driveToExit(engine);
      return;
    case 'defeat':
      engine.start();
      advanceUntil(engine, () => engine.status !== 'playing', 600);
      return;
  }
};

export interface TestHooks {
  seed: (seed: number) => { seed: number };
  setState: (name: string) => Promise<{ state: string }>;
  setPausedForScreenshot: (paused: boolean) => void;
}

declare global {
  interface Window {
    __THREE_GAME_TEST_HOOKS__?: TestHooks;
  }
}
