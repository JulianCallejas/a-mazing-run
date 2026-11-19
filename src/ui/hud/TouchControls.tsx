import { useState, type PointerEvent as ReactPointerEvent, type RefObject } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, RotateCcw, RotateCw } from 'lucide-react';
import type { CameraMode, MoveInput } from '../../game/core/controls';
import type { GameIntents } from '../../game/scene/useGameInput';

interface TouchControlsProps {
  intents: RefObject<GameIntents | null>;
  mode: CameraMode;
}

const isCoarsePointer = () => {
  try {
    return window.matchMedia('(pointer: coarse)').matches;
  } catch {
    return false;
  }
};

/** A hold-to-move pad button: pointer capture plus every release path. */
const HoldButton = ({
  intents,
  source,
  move,
  label,
  className,
  children,
}: {
  intents: RefObject<GameIntents | null>;
  source: string;
  move: MoveInput;
  label: string;
  className: string;
  children: React.ReactNode;
}) => {
  const start = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    intents.current?.moveStart(source, move);
  };
  const end = () => intents.current?.moveEnd(source);
  return (
    <button
      type="button"
      aria-label={label}
      className={`btn btn-icon !w-14 !h-14 touch-none ${className}`}
      onPointerDown={start}
      onPointerUp={end}
      onPointerCancel={end}
      onLostPointerCapture={end}
      onContextMenu={(e) => e.preventDefault()}
    >
      {children}
    </button>
  );
};

/**
 * On-screen pad for touch devices. Chase view: hold forward/back, tap to turn.
 * Map view: hold a compass direction. Emits the same intents as the keyboard.
 */
const TouchControls = ({ intents, mode }: TouchControlsProps) => {
  const [enabled] = useState(isCoarsePointer);
  if (!enabled) return null;

  const icon = 'w-6 h-6';
  return (
    <div
      className="pointer-events-auto absolute z-10 grid grid-cols-3 grid-rows-3 gap-1.5 touch-none select-none"
      style={{
        left: 'max(1rem, env(safe-area-inset-left))',
        bottom: 'max(1rem, env(safe-area-inset-bottom))',
      }}
    >
      {mode === 'third-person' ? (
        <>
          <HoldButton intents={intents} source="touch-up" move="forward" label="Walk forward" className="col-start-2 row-start-1">
            <ChevronUp className={icon} />
          </HoldButton>
          <button
            type="button"
            aria-label="Turn left"
            className="btn btn-icon !w-14 !h-14 touch-none col-start-1 row-start-2"
            onPointerDown={() => intents.current?.turn(-1)}
          >
            <RotateCcw className={icon} />
          </button>
          <button
            type="button"
            aria-label="Turn right"
            className="btn btn-icon !w-14 !h-14 touch-none col-start-3 row-start-2"
            onPointerDown={() => intents.current?.turn(1)}
          >
            <RotateCw className={icon} />
          </button>
          <HoldButton intents={intents} source="touch-down" move="back" label="Walk back" className="col-start-2 row-start-3">
            <ChevronDown className={icon} />
          </HoldButton>
        </>
      ) : (
        <>
          <HoldButton intents={intents} source="touch-up" move="north" label="Move north" className="col-start-2 row-start-1">
            <ChevronUp className={icon} />
          </HoldButton>
          <HoldButton intents={intents} source="touch-left" move="west" label="Move west" className="col-start-1 row-start-2">
            <ChevronLeft className={icon} />
          </HoldButton>
          <HoldButton intents={intents} source="touch-right" move="east" label="Move east" className="col-start-3 row-start-2">
            <ChevronRight className={icon} />
          </HoldButton>
          <HoldButton intents={intents} source="touch-down" move="south" label="Move south" className="col-start-2 row-start-3">
            <ChevronDown className={icon} />
          </HoldButton>
        </>
      )}
    </div>
  );
};

export default TouchControls;
