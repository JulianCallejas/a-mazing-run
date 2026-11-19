import { useFrame } from '@react-three/fiber';
import type { GameEngine, GameEvent } from '../core/engine';

interface GameLoopProps {
  engine: GameEngine;
  onEvents: (events: GameEvent[]) => void;
  onFrame?: (elapsed: number) => void;
}

/**
 * Drives the simulation from the render loop. Mount it before any component
 * that reads engine state so they all see the same simulation tick.
 */
const GameLoop = ({ engine, onEvents, onFrame }: GameLoopProps) => {
  useFrame((_, delta) => {
    engine.update(delta);
    const events = engine.drainEvents();
    if (events.length > 0) onEvents(events);
    onFrame?.(engine.elapsed);
  });
  return null;
};

export default GameLoop;
