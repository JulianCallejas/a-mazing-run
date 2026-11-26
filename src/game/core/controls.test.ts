import { describe, expect, it } from 'vitest';
import {
  classifySwipe,
  keyToAction,
  resolveMove,
  rotateDirection,
  swipeToAction,
  yawIndexToDirection,
} from './controls';

describe('rotateDirection', () => {
  it('rotates clockwise for positive quarter turns and wraps around', () => {
    expect(rotateDirection('north', 1)).toBe('east');
    expect(rotateDirection('north', 2)).toBe('south');
    expect(rotateDirection('west', 1)).toBe('north');
    expect(rotateDirection('north', -1)).toBe('west');
    expect(rotateDirection('east', -6)).toBe('west');
  });
});

describe('yawIndexToDirection', () => {
  it('maps any integer yaw index (including negatives) to a facing', () => {
    expect(yawIndexToDirection(0)).toBe('north');
    expect(yawIndexToDirection(1)).toBe('east');
    expect(yawIndexToDirection(-1)).toBe('west');
    expect(yawIndexToDirection(6)).toBe('south');
  });
});

describe('keyToAction', () => {
  it('third-person: W/S/↑/↓ move relative to the camera, A/D/←/→ turn it', () => {
    expect(keyToAction('KeyW', 'third-person')).toEqual({ type: 'move', move: 'forward' });
    expect(keyToAction('ArrowUp', 'third-person')).toEqual({ type: 'move', move: 'forward' });
    expect(keyToAction('KeyS', 'third-person')).toEqual({ type: 'move', move: 'back' });
    expect(keyToAction('ArrowDown', 'third-person')).toEqual({ type: 'move', move: 'back' });
    expect(keyToAction('KeyA', 'third-person')).toEqual({ type: 'turn', quarterTurns: -1 });
    expect(keyToAction('ArrowLeft', 'third-person')).toEqual({ type: 'turn', quarterTurns: -1 });
    expect(keyToAction('KeyD', 'third-person')).toEqual({ type: 'turn', quarterTurns: 1 });
    expect(keyToAction('ArrowRight', 'third-person')).toEqual({ type: 'turn', quarterTurns: 1 });
  });

  it('aerial: WASD and arrows move in absolute map directions (north up)', () => {
    expect(keyToAction('KeyW', 'aerial')).toEqual({ type: 'move', move: 'north' });
    expect(keyToAction('ArrowRight', 'aerial')).toEqual({ type: 'move', move: 'east' });
    expect(keyToAction('KeyS', 'aerial')).toEqual({ type: 'move', move: 'south' });
    expect(keyToAction('ArrowLeft', 'aerial')).toEqual({ type: 'move', move: 'west' });
  });

  it('maps C to camera toggle, Escape/P to pause and ignores other keys', () => {
    expect(keyToAction('KeyC', 'aerial')).toEqual({ type: 'toggle-camera' });
    expect(keyToAction('Escape', 'third-person')).toEqual({ type: 'pause' });
    expect(keyToAction('KeyP', 'third-person')).toEqual({ type: 'pause' });
    expect(keyToAction('KeyX', 'third-person')).toBeNull();
  });
});

describe('classifySwipe', () => {
  it('ignores drags inside the dead zone', () => {
    expect(classifySwipe(0, 0)).toBeNull();
    expect(classifySwipe(10, -12)).toBeNull();
  });

  it('picks the dominant axis (screen y grows downward)', () => {
    expect(classifySwipe(0, -60)).toBe('up');
    expect(classifySwipe(5, 60)).toBe('down');
    expect(classifySwipe(-60, 20)).toBe('left');
    expect(classifySwipe(60, -20)).toBe('right');
  });
});

describe('swipeToAction', () => {
  it('third-person: up/down walk, left/right turn', () => {
    expect(swipeToAction('up', 'third-person')).toEqual({ type: 'move', move: 'forward' });
    expect(swipeToAction('down', 'third-person')).toEqual({ type: 'move', move: 'back' });
    expect(swipeToAction('left', 'third-person')).toEqual({ type: 'turn', quarterTurns: -1 });
    expect(swipeToAction('right', 'third-person')).toEqual({ type: 'turn', quarterTurns: 1 });
  });

  it('aerial: the swipe is an absolute map direction', () => {
    expect(swipeToAction('up', 'aerial')).toEqual({ type: 'move', move: 'north' });
    expect(swipeToAction('down', 'aerial')).toEqual({ type: 'move', move: 'south' });
    expect(swipeToAction('left', 'aerial')).toEqual({ type: 'move', move: 'west' });
    expect(swipeToAction('right', 'aerial')).toEqual({ type: 'move', move: 'east' });
  });
});

describe('resolveMove', () => {
  it('turns relative moves into grid directions for the camera yaw', () => {
    expect(resolveMove('forward', 0)).toBe('north');
    expect(resolveMove('forward', 1)).toBe('east');
    expect(resolveMove('back', 1)).toBe('west');
    expect(resolveMove('forward', -2)).toBe('south');
  });

  it('passes absolute directions through unchanged', () => {
    expect(resolveMove('east', 3)).toBe('east');
  });
});
