import { useImperativeHandle, useRef, type Ref } from 'react';
import { Eye, Hourglass, House, Map as MapIcon, Pause, Play, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import type { GameEngine, GameStatus } from '../../game/core/engine';
import type { CameraMode } from '../../game/core/controls';
import { formatTime, type Difficulty, type VisualEffect } from '../../game/core/scoring';
import { difficultyInfo, weatherInfo } from '../options';
import GuardianHelmIcon from '../components/GuardianHelmIcon';
import Minimap, { type MinimapHandle } from './Minimap';

export interface HudHandle {
  /**
   * Called every render frame with live engine state; writes the DOM directly.
   * Returns the 0..1 threat level of the nearest awake guardian.
   */
  update: (engine: GameEngine, time: number, guardiansAwake: boolean) => number;
  resetTimer: () => void;
}

export interface Banner {
  id: number;
  text: string;
  tone: 'gold' | 'danger';
}

interface HudProps {
  ref?: Ref<HudHandle>;
  engine: GameEngine;
  status: GameStatus;
  difficulty: Difficulty;
  effect: VisualEffect;
  cameraMode: CameraMode;
  soundEnabled: boolean;
  banner: Banner | null;
  onTogglePause: () => void;
  onToggleCamera: () => void;
  onToggleSound: () => void;
  onRestart: () => void;
  onExit: () => void;
}

const IconButton = ({
  label,
  onClick,
  disabled,
  className = '',
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
}) => (
  <button type="button" className={`btn btn-icon ${className}`} aria-label={label} title={label} onClick={onClick} disabled={disabled}>
    {children}
  </button>
);

/**
 * In-game HUD. Layout: top-left timer/trial cluster, top-right actions,
 * bottom-right fog-of-war map, bottom-left key hints, center-top banners.
 * Nothing covers the hero (screen center) or the corridor ahead.
 */
const Hud = ({
  ref,
  engine,
  status,
  difficulty,
  effect,
  cameraMode,
  soundEnabled,
  banner,
  onTogglePause,
  onToggleCamera,
  onToggleSound,
  onRestart,
  onExit,
}: HudProps) => {
  const timeLabel = useRef<HTMLSpanElement>(null);
  const danger = useRef<HTMLDivElement>(null);
  const minimap = useRef<MinimapHandle>(null);
  const trial = difficultyInfo(difficulty);
  const weather = weatherInfo(effect);
  const WeatherIcon = weather.icon;

  useImperativeHandle(
    ref,
    () => ({
      update: (current, time, guardiansAwake) => {
        const label = timeLabel.current;
        const text = formatTime(current.elapsed);
        if (label && label.textContent !== text) label.textContent = text;

        // Danger vignette: nearest guardian within ~4.5 tiles, only once awake.
        let nearest = Infinity;
        for (const enemy of current.enemies) {
          const d = Math.hypot(enemy.position.x - current.player.position.x, enemy.position.z - current.player.position.z);
          nearest = Math.min(nearest, d);
        }
        const threat = guardiansAwake && current.status === 'playing' ? Math.max(0, Math.min(1, 1 - (nearest - 1.2) / 3.4)) : 0;
        const pulse = 0.75 + 0.25 * Math.sin(time * (5 + threat * 6));
        if (danger.current) danger.current.style.opacity = (threat * pulse).toFixed(3);

        minimap.current?.update(current, time);
        return threat;
      },
      resetTimer: () => {
        if (timeLabel.current) timeLabel.current.textContent = formatTime(0);
        if (danger.current) danger.current.style.opacity = '0';
      },
    }),
    [],
  );

  const finished = status === 'won' || status === 'lost';

  return (
    <>
      {status === 'lost' && (
        <div className="pointer-events-none absolute inset-0 z-[6] bg-[rgb(170_20_20)] animate-hit-flash" aria-hidden="true" />
      )}
      <div
        ref={danger}
        className="pointer-events-none absolute inset-0 z-[5] opacity-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgb(160_18_18/0.55)_100%)]"
        aria-hidden="true"
      />

      <div className="pointer-events-none absolute inset-0 z-10 p-[max(1rem,env(safe-area-inset-top))] flex flex-col justify-between">
        <div className="flex items-start justify-between gap-4">
          <div className="panel pointer-events-auto px-4 py-3 min-w-[11.5rem]">
            <div className="flex items-center gap-2.5">
              <Hourglass className="w-5 h-5 text-gold-400 animate-flicker" aria-hidden="true" />
              <span ref={timeLabel} className="numeric text-3xl leading-none text-parchment-100 w-[4.5ch]" aria-live="off">
                0:00
              </span>
            </div>
            <div className="mt-2 flex items-center gap-2 text-sm text-parchment-300">
              <span className="font-label">{trial.label}</span>
              <span className="flex gap-0.5" aria-label={`${trial.guardians} guardians`}>
                {Array.from({ length: trial.guardians }, (_, i) => (
                  <GuardianHelmIcon key={i} className="w-4 h-4" />
                ))}
              </span>
              <WeatherIcon className="w-4 h-4 text-frost-300 ml-auto" aria-label={weather.label} />
            </div>
          </div>

          <div className="pointer-events-auto flex gap-2">
            <IconButton label={status === 'paused' ? 'Resume' : 'Pause'} onClick={onTogglePause} disabled={finished || status === 'ready'}>
              {status === 'paused' ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
            </IconButton>
            <IconButton label={cameraMode === 'aerial' ? 'Chase view' : 'Map view'} onClick={onToggleCamera}>
              {cameraMode === 'aerial' ? <Eye className="w-5 h-5" /> : <MapIcon className="w-5 h-5" />}
            </IconButton>
            {/* Secondary actions live in the pause menu on narrow screens. */}
            <IconButton label={soundEnabled ? 'Mute' : 'Unmute'} onClick={onToggleSound} className="!hidden sm:!inline-flex">
              {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </IconButton>
            <IconButton label="Restart" onClick={onRestart} className="!hidden sm:!inline-flex">
              <RotateCcw className="w-5 h-5" />
            </IconButton>
            <IconButton label="Main menu" onClick={onExit} className="!hidden sm:!inline-flex">
              <House className="w-5 h-5" />
            </IconButton>
          </div>
        </div>

        {banner && (
          <div className="absolute inset-x-0 top-[18%] flex justify-center px-4">
            <p
              key={banner.id}
              className={`animate-banner font-display text-3xl sm:text-5xl text-center drop-shadow-[0_2px_8px_rgb(0_0_0/0.9)] ${
                banner.tone === 'danger' ? 'text-ember-400' : 'title-gilded'
              }`}
              role="status"
            >
              {banner.text}
            </p>
          </div>
        )}

        {status === 'ready' && (
          <div className="absolute inset-x-0 bottom-[16%] flex justify-center px-4">
            <div className="panel px-6 py-3.5 flex items-center gap-3 animate-rise">
              <span className="font-label text-lg text-parchment-100">Take your first step</span>
              <kbd className="keycap pointer-coarse:hidden">W</kbd>
              <kbd className="keycap pointer-coarse:hidden">↑</kbd>
            </div>
          </div>
        )}

        <div className="flex items-end justify-between gap-4">
          <div className="panel px-3.5 py-2.5 text-sm text-parchment-300 space-y-1.5 hidden sm:block pointer-coarse:hidden">
            {cameraMode === 'third-person' ? (
              <>
                <p className="flex items-center gap-1.5">
                  <kbd className="keycap">W</kbd>
                  <kbd className="keycap">S</kbd> move
                  <kbd className="keycap ml-2">A</kbd>
                  <kbd className="keycap">D</kbd> turn
                </p>
              </>
            ) : (
              <p className="flex items-center gap-1.5">
                <kbd className="keycap">W</kbd>
                <kbd className="keycap">A</kbd>
                <kbd className="keycap">S</kbd>
                <kbd className="keycap">D</kbd> move · north is up
              </p>
            )}
            <p className="flex items-center gap-1.5">
              <kbd className="keycap">C</kbd> view
              <kbd className="keycap ml-2">Esc</kbd> pause
            </p>
          </div>

          <div className="panel p-2.5 pointer-events-auto ml-auto origin-bottom-right scale-[0.7] sm:scale-100">
            <Minimap ref={minimap} engine={engine} />
          </div>
        </div>
      </div>
    </>
  );
};

export default Hud;
