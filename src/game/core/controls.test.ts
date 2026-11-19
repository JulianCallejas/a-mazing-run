import { describe, expect, it } from 'vitest';
import { keyToAction, resolveMove, rotateDirection, yawIndexToDirection } from './controls';

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
