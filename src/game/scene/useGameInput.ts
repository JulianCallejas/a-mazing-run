import { useEffect, useRef } from 'react';
import type { Direction, GameEngine } from '../core/engine';
import { keyToAction, resolveMove, type CameraMode, type MoveInput } from '../core/controls';
import type { CameraRigState } from './CameraRig';

/**
 * Device-independent game intents. Keyboard and touch controls both call
 * these, so every input path drives the engine the same way.
 */
export interface GameIntents {
  /** Starts (or keeps) moving; `source` identifies the key/button holding it. */
  moveStart: (source: string, move: MoveInput) => void;
  moveEnd: (source: string) => void;
  turn: (quarterTurns: -1 | 1) => void;
  toggleCamera: () => void;
  togglePause: () => void;
}

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
 * Builds the intent API for the current run and binds the keyboard to it.
 * Tracks which engine direction each held source maps to, so turning the
 * camera re-targets held relative moves without stutter.
 */
export const useGameInput = ({
  engine,
  mode,
  rig,
  onStatusChange,
  onToggleCamera,
  onTogglePause,
}: GameInputOptions) => {
  const intents = useRef<GameIntents | null>(null);

  useEffect(() => {
    const held = new Map<string, { move: MoveInput; direction: Direction }>();

    const releaseAll = () => {
      held.clear();
      engine.releaseAll();
    };

    const api: GameIntents = {
      moveStart: (source, move) => {
        if (engine.status === 'ready') {
          engine.start();
          onStatusChange();
        }
        if (engine.status !== 'playing') return;
        const previous = held.get(source);
        if (previous) engine.release(previous.direction);
        const direction = resolveMove(move, rig.yawIndex);
        held.set(source, { move, direction });
        engine.press(direction);
      },
      moveEnd: (source) => {
        const entry = held.get(source);
        if (!entry) return;
        held.delete(source);
        engine.release(entry.direction);
      },
      turn: (quarterTurns) => {
        if (engine.status === 'won' || engine.status === 'lost') return;
        rig.yawIndex += quarterTurns;
        for (const entry of held.values()) {
          const next = resolveMove(entry.move, rig.yawIndex);
          if (next !== entry.direction) {
            engine.release(entry.direction);
            entry.direction = next;
            engine.press(next);
          }
        }
      },
      toggleCamera: () => {
        releaseAll();
        onToggleCamera();
      },
      togglePause: () => {
        releaseAll();
        onTogglePause();
      },
    };
    intents.current = api;

    const onKeyDown = (event: KeyboardEvent) => {
      const action = keyToAction(event.code, mode);
      if (!action) return;
      event.preventDefault();
      if (event.repeat) return;
      switch (action.type) {
        case 'move':
          api.moveStart(event.code, action.move);
          return;
        case 'turn':
          api.turn(action.quarterTurns);
          return;
        case 'toggle-camera':
          api.toggleCamera();
          return;
        case 'pause':
          api.togglePause();
          return;
      }
    };

    const onKeyUp = (event: KeyboardEvent) => api.moveEnd(event.code);

    const onVisibility = () => {
      if (document.hidden && engine.status === 'playing') api.togglePause();
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
      intents.current = null;
      engine.releaseAll();
    };
  }, [engine, mode, rig, onStatusChange, onToggleCamera, onTogglePause]);

  return intents;
};
