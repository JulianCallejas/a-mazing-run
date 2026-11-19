import type { Direction } from './engine';

export type CameraMode = 'third-person' | 'aerial';
export type RelativeMove = 'forward' | 'back';
export type MoveInput = RelativeMove | Direction;

export type InputAction =
  | { type: 'move'; move: MoveInput }
  | { type: 'turn'; quarterTurns: -1 | 1 }
  | { type: 'toggle-camera' }
  | { type: 'pause' };

const CLOCKWISE: readonly Direction[] = ['north', 'east', 'south', 'west'];

const wrap4 = (n: number) => ((n % 4) + 4) % 4;

export const rotateDirection = (direction: Direction, quarterTurns: number): Direction =>
  CLOCKWISE[wrap4(CLOCKWISE.indexOf(direction) + quarterTurns)];

/** Camera yaw index: 0 = looking north, 1 = east, 2 = south, 3 = west (any integer). */
export const yawIndexToDirection = (yawIndex: number): Direction => CLOCKWISE[wrap4(yawIndex)];

/** Resolves a (possibly camera-relative) move into a grid direction. */
export const resolveMove = (move: MoveInput, yawIndex: number): Direction => {
  const facing = yawIndexToDirection(yawIndex);
  if (move === 'forward') return facing;
  if (move === 'back') return rotateDirection(facing, 2);
  return move;
};

const UP = ['KeyW', 'ArrowUp'];
const DOWN = ['KeyS', 'ArrowDown'];
const LEFT = ['KeyA', 'ArrowLeft'];
const RIGHT = ['KeyD', 'ArrowRight'];

/**
 * Keyboard mapping. Third-person: forward/back move relative to the camera and
 * left/right turn the camera 90°. Aerial: absolute, north-up movement.
 */
export const keyToAction = (code: string, mode: CameraMode): InputAction | null => {
  if (code === 'KeyC') return { type: 'toggle-camera' };
  if (code === 'Escape' || code === 'KeyP') return { type: 'pause' };

  if (mode === 'third-person') {
    if (UP.includes(code)) return { type: 'move', move: 'forward' };
    if (DOWN.includes(code)) return { type: 'move', move: 'back' };
    if (LEFT.includes(code)) return { type: 'turn', quarterTurns: -1 };
    if (RIGHT.includes(code)) return { type: 'turn', quarterTurns: 1 };
    return null;
  }

  if (UP.includes(code)) return { type: 'move', move: 'north' };
  if (DOWN.includes(code)) return { type: 'move', move: 'south' };
  if (LEFT.includes(code)) return { type: 'move', move: 'west' };
  if (RIGHT.includes(code)) return { type: 'move', move: 'east' };
  return null;
};
