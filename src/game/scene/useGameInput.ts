import { useEffect } from 'react';
import type { Direction, GameEngine } from '../core/engine';
import { keyToAction, resolveMove, type CameraMode, type MoveInput } from '../core/controls';
import type { CameraRigState } from './CameraRig';

interface GameInputOptions {
  engine: GameEngine;
  mode: CameraMode;
  rig: CameraRigState;
  /** Called after the engine status may have changed (start/pause/resume). */
  onStatusChange: () => void;
  onToggleCamera: () => void;
  onTogglePause: () => void;
}

/**
 * Keyboard → engine bridge. Tracks which engine direction each held key maps
 * to, so turning the camera re-targets held relative keys without stutter.
 */
export const useGameInput = ({
  engine,
  mode,
  rig,
  onStatusChange,
  onToggleCamera,
  onTogglePause,
}: GameInputOptions) => {
  useEffect(() => {
    const pressed = new Map<string, { move: MoveInput; direction: Direction }>();

    const releaseAll = () => {
      pressed.clear();
      engine.releaseAll();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      const action = keyToAction(event.code, mode);
      if (!action) return;
      event.preventDefault();
      if (event.repeat) return;

      switch (action.type) {
        case 'move': {
          if (engine.status === 'ready') {
            engine.start();
            onStatusChange();
          }
          if (engine.status !== 'playing') return;
          const direction = resolveMove(action.move, rig.yawIndex);
          pressed.set(event.code, { move: action.move, direction });
          engine.press(direction);
          return;
        }
        case 'turn': {
          if (engine.status === 'won' || engine.status === 'lost') return;
          rig.yawIndex += action.quarterTurns;
          for (const entry of pressed.values()) {
            const next = resolveMove(entry.move, rig.yawIndex);
            if (next !== entry.direction) {
              engine.release(entry.direction);
              entry.direction = next;
              engine.press(next);
            }
          }
          return;
        }
        case 'toggle-camera':
          releaseAll();
          onToggleCamera();
          return;
        case 'pause':
          releaseAll();
          onTogglePause();
          return;
      }
    };

    const onKeyUp = (event: KeyboardEvent) => {
      const entry = pressed.get(event.code);
      if (!entry) return;
      pressed.delete(event.code);
      engine.release(entry.direction);
    };

    const onVisibility = () => {
      if (document.hidden && engine.status === 'playing') {
        releaseAll();
        onTogglePause();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', releaseAll);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', releaseAll);
      document.removeEventListener('visibilitychange', onVisibility);
      engine.releaseAll();
    };
  }, [engine, mode, rig, onStatusChange, onToggleCamera, onTogglePause]);
};
