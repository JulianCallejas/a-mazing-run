import { useImperativeHandle, useLayoutEffect, useRef, type Ref } from 'react';
import type { GameEngine } from '../../game/core/engine';
import { Cell } from '../../game/core/maze';
import { createExploration, isRevealed, revealAround, type Exploration } from '../../game/core/exploration';

export interface MinimapHandle {
  update: (engine: GameEngine, time: number) => void;
}

interface MinimapProps {
  engine: GameEngine;
  ref?: Ref<MinimapHandle>;
}

const MAP_PX = 168;
const REVEAL_RADIUS = 2.2;
/** Guardians are drawn only when revealed and within this many tiles. */
const SENSE_RADIUS = 6;
const COLORS = {
  wall: '#3b404d',
  floor: '#191d27',
  exit: '#f0d993',
  start: '#b64362',
  player: '#efe4cc',
  guardian: '#ff4630',
};

const ARROW: Record<string, number> = { north: 0, east: Math.PI / 2, south: Math.PI, west: -Math.PI / 2 };

/** Fog-of-war map: reveals the halls the hero has walked; the exit appears once found. */
const Minimap = ({ engine, ref }: MinimapProps) => {
  const canvas = useRef<HTMLCanvasElement>(null);
  const exploration = useRef<Exploration | null>(null);
  const lastDraw = useRef(0);
  const { width, height } = engine.maze;
  const cell = Math.max(3, Math.floor(MAP_PX / Math.max(width, height)));

  useLayoutEffect(() => {
    exploration.current = createExploration(width, height);
    lastDraw.current = 0;
  }, [engine, width, height]);

  useImperativeHandle(
    ref,
    () => ({
      update: (current, time) => {
        const ex = exploration.current;
        const ctx = canvas.current?.getContext('2d');
        if (!ex || !ctx) return;
        const { x, z } = current.player.position;
        revealAround(ex, x, z, REVEAL_RADIUS);
        if (time - lastDraw.current < 1 / 15) return;
        lastDraw.current = time;

        const { grid, start, exit } = current.maze;
        ctx.clearRect(0, 0, width * cell, height * cell);
        for (let gz = 0; gz < height; gz++) {
          for (let gx = 0; gx < width; gx++) {
            if (!isRevealed(ex, gx, gz)) continue;
            ctx.fillStyle = grid[gz][gx] === Cell.Wall ? COLORS.wall : COLORS.floor;
            ctx.fillRect(gx * cell, gz * cell, cell, cell);
          }
        }
        if (isRevealed(ex, start.x, start.z)) {
          ctx.fillStyle = COLORS.start;
          ctx.fillRect(start.x * cell + cell * 0.3, start.z * cell + cell * 0.3, cell * 0.4, cell * 0.4);
        }
        if (isRevealed(ex, exit.x, exit.z)) {
          const ex2 = exit.x * cell + cell / 2;
          const ez = exit.z * cell + cell / 2;
          const r = cell * (0.55 + 0.15 * Math.sin(time * 4));
          ctx.fillStyle = COLORS.exit;
          ctx.beginPath();
          ctx.moveTo(ex2, ez - r);
          ctx.lineTo(ex2 + r, ez);
          ctx.lineTo(ex2, ez + r);
          ctx.lineTo(ex2 - r, ez);
          ctx.fill();
        }
        for (const enemy of current.enemies) {
          const gx = Math.round(enemy.position.x);
          const gz = Math.round(enemy.position.z);
          const near = Math.hypot(enemy.position.x - x, enemy.position.z - z) <= SENSE_RADIUS;
          if (!near || !isRevealed(ex, gx, gz)) continue;
          ctx.fillStyle = COLORS.guardian;
          ctx.beginPath();
          ctx.arc((enemy.position.x + 0.5) * cell, (enemy.position.z + 0.5) * cell, cell * 0.45, 0, Math.PI * 2);
          ctx.fill();
        }
        // Player arrow, pointing along its facing.
        ctx.save();
        ctx.translate((x + 0.5) * cell, (z + 0.5) * cell);
        ctx.rotate(ARROW[current.player.facing] ?? 0);
        ctx.fillStyle = COLORS.player;
        ctx.beginPath();
        const s = Math.max(3, cell * 0.7);
        ctx.moveTo(0, -s);
        ctx.lineTo(s * 0.75, s * 0.7);
        ctx.lineTo(0, s * 0.35);
        ctx.lineTo(-s * 0.75, s * 0.7);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      },
    }),
    [cell, width, height],
  );

  return (
    <canvas
      ref={canvas}
      width={width * cell}
      height={height * cell}
      className="block"
      style={{ width: width * cell, height: height * cell, imageRendering: 'pixelated' }}
      role="img"
      aria-label="Explored map"
    />
  );
};

export default Minimap;
