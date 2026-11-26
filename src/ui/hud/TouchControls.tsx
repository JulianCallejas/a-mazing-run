import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp } from 'lucide-react';
import { classifySwipe, swipeToAction, type CameraMode, type Swipe } from '../../game/core/controls';
import type { GameIntents } from '../../game/scene/useGameInput';

interface TouchControlsProps {
  intents: RefObject<GameIntents | null>;
  mode: CameraMode;
  /** Gestures are only captured while a run is ready/playing, so overlays stay tappable. */
  active: boolean;
}

/** A touch shorter than this that never became a swipe is a tap (stop). */
const TAP_MAX_MS = 300;
const MOVE_SOURCE = 'touch-swipe';
const ARROWS = { up: ArrowUp, down: ArrowDown, left: ArrowLeft, right: ArrowRight } as const;

const isCoarsePointer = () => {
  try {
    return window.matchMedia('(pointer: coarse)').matches;
  } catch {
    return false;
  }
};

const buzz = () => {
  try {
    navigator.vibrate?.(8);
  } catch {
    /* haptics are optional */
  }
};

interface Gesture {
  pointerId: number;
  originX: number;
  originY: number;
  startedAt: number;
  acted: boolean;
  turned: boolean;
}

/**
 * Full-screen swipe layer for touch devices. Swipe sets the direction (it keeps
 * going after you lift the finger); tap stops. Chase view: up/down walk
 * forward/back, left/right turn once per gesture. Map view: the swipe is the
 * absolute direction. Emits the same intents as the keyboard.
 */
const TouchControls = ({ intents, mode, active }: TouchControlsProps) => {
  const [enabled] = useState(isCoarsePointer);
  const gesture = useRef<Gesture | null>(null);
  const [flash, setFlash] = useState<{ id: number; swipe: Swipe; x: number; y: number } | null>(null);
  const [showHint, setShowHint] = useState(true);
  const flashId = useRef(0);

  useEffect(() => {
    if (!flash) return;
    const timer = window.setTimeout(() => setFlash(null), 420);
    return () => window.clearTimeout(timer);
  }, [flash]);

  if (!enabled || !active) return null;

  const apply = (swipe: Swipe, x: number, y: number) => {
    const g = gesture.current;
    if (!g) return;
    const action = swipeToAction(swipe, mode);
    if (action.type === 'move') {
      intents.current?.moveStart(MOVE_SOURCE, action.move);
    } else if (action.type === 'turn') {
      if (g.turned) return;
      g.turned = true;
      intents.current?.turn(action.quarterTurns);
    }
    g.acted = true;
    // Re-anchor so the next direction change is measured from here, without lifting the finger.
    g.originX = x;
    g.originY = y;
    setShowHint(false);
    setFlash({ id: ++flashId.current, swipe, x, y });
    buzz();
  };

  const onDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (gesture.current) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    gesture.current = {
      pointerId: event.pointerId,
      originX: event.clientX,
      originY: event.clientY,
      startedAt: performance.now(),
      acted: false,
      turned: false,
    };
  };

  const onMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    if (!g || g.pointerId !== event.pointerId) return;
    const swipe = classifySwipe(event.clientX - g.originX, event.clientY - g.originY);
    if (swipe) apply(swipe, event.clientX, event.clientY);
  };

  const onUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    if (!g || g.pointerId !== event.pointerId) return;
    gesture.current = null;
    if (!g.acted && performance.now() - g.startedAt <= TAP_MAX_MS) {
      intents.current?.moveEnd(MOVE_SOURCE);
    }
  };

  const onCancel = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (gesture.current?.pointerId === event.pointerId) gesture.current = null;
  };

  const Arrow = flash ? ARROWS[flash.swipe] : null;

  return (
    <div
      className="absolute inset-0 z-[7] touch-none select-none [-webkit-touch-callout:none]"
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onCancel}
      onContextMenu={(e) => e.preventDefault()}
    >
      {Arrow && flash && (
        <Arrow
          key={flash.id}
          aria-hidden="true"
          className="pointer-events-none absolute w-10 h-10 -translate-x-1/2 -translate-y-1/2 text-gold-400/60 animate-ping"
          style={{ left: flash.x, top: flash.y, animationIterationCount: 1, animationDuration: '420ms' }}
        />
      )}
      {showHint && (
        <p className="pointer-events-none absolute inset-x-0 bottom-[max(1.5rem,env(safe-area-inset-bottom))] text-center text-sm text-parchment-100/70">
          {mode === 'third-person'
            ? 'Swipe up/down to walk, sideways to turn, tap to stop'
            : 'Swipe to move in that direction, tap to stop'}
        </p>
      )}
    </div>
  );
};

export default TouchControls;
