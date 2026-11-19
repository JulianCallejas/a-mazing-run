import { useEffect, useRef, useState } from 'react';
import { Crown, House, Play, RotateCcw, Skull, Volume2, VolumeX } from 'lucide-react';
import { formatTime, type Difficulty, type VisualEffect } from '../../game/core/scoring';
import type { ScoreEntry } from '../../game/core/highScores';
import { difficultyInfo, weatherInfo } from '../options';

interface PauseOverlayProps {
  soundEnabled: boolean;
  onResume: () => void;
  onRestart: () => void;
  onToggleSound: () => void;
  onExit: () => void;
}

/** Moves keyboard focus to the primary action when an overlay opens. */
const useAutoFocus = <T extends HTMLElement>() => {
  const ref = useRef<T>(null);
  useEffect(() => {
    ref.current?.focus();
  }, []);
  return ref;
};

export const PauseOverlay = ({ soundEnabled, onResume, onRestart, onToggleSound, onExit }: PauseOverlayProps) => {
  const primary = useAutoFocus<HTMLButtonElement>();
  return (
    <div className="scrim absolute inset-0 z-20 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="pause-title">
      <div className="panel w-full max-w-sm p-7 text-center animate-rise">
        <h2 id="pause-title" className="title-gilded text-5xl">
          Paused
        </h2>
        <p className="mt-1 font-label text-parchment-500">The guardians wait in the dark.</p>
        <div className="mt-6 grid gap-2.5">
          <button ref={primary} type="button" className="btn btn-primary py-3 text-lg" onClick={onResume}>
            <Play className="w-5 h-5" aria-hidden="true" />
            Resume
          </button>
          <button type="button" className="btn btn-secondary py-2.5" onClick={onRestart}>
            <RotateCcw className="w-4 h-4" aria-hidden="true" />
            New maze
          </button>
          <button type="button" className="btn btn-secondary py-2.5" onClick={onToggleSound}>
            {soundEnabled ? <Volume2 className="w-4 h-4" aria-hidden="true" /> : <VolumeX className="w-4 h-4" aria-hidden="true" />}
            {soundEnabled ? 'Sound on' : 'Sound off'}
          </button>
          <button type="button" className="btn btn-ghost py-2.5" onClick={onExit}>
            <House className="w-4 h-4" aria-hidden="true" />
            Main menu
          </button>
        </div>
      </div>
    </div>
  );
};

/** Animates a number from 0 to `target` over `duration` ms (ease-out). */
const useCountUp = (target: number, duration = 1100) => {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let frame = 0;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      setValue(Math.round(target * (1 - (1 - t) ** 3)));
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);
  return value;
};

interface ResultOverlayProps {
  outcome: 'won' | 'lost';
  entry: ScoreEntry | null;
  rank: number | null;
  survived: number;
  difficulty: Difficulty;
  effect: VisualEffect;
  onRetry: () => void;
  onExit: () => void;
}

export const ResultOverlay = ({ outcome, entry, rank, survived, difficulty, effect, onRetry, onExit }: ResultOverlayProps) => {
  const primary = useAutoFocus<HTMLButtonElement>();
  const score = useCountUp(entry?.score ?? 0);
  const won = outcome === 'won';
  const weather = weatherInfo(effect);

  return (
    <div className="scrim absolute inset-0 z-20 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="result-title">
      <div className="panel w-full max-w-md p-7 sm:p-8 text-center animate-rise">
        <div className="rule-ornament" aria-hidden="true">
          {won ? <Crown className="w-6 h-6" /> : <Skull className="w-6 h-6 text-ember-400" />}
        </div>
        <h2 id="result-title" className={`mt-2 text-5xl sm:text-6xl ${won ? 'title-gilded' : 'font-display text-ember-400'}`}>
          {won ? 'You Escaped!' : 'Caught!'}
        </h2>
        <p className="mt-1 font-label text-parchment-300">
          {won ? 'The golden gate closes behind you.' : 'A guardian claimed you in the dark.'}
        </p>

        {won && entry ? (
          <>
            <p className="mt-6 numeric text-6xl text-gold-300" aria-label={`Score ${entry.score}`}>
              {score}
            </p>
            <p className="font-label text-sm tracking-[0.2em] text-parchment-500">points</p>
            {rank !== null && (
              <p className={`mt-3 font-label text-lg ${rank === 1 ? 'text-gold-300 animate-flicker' : 'text-parchment-300'}`}>
                {rank === 1 ? 'A new legend — first in the Hall of Fame!' : `Rank #${rank} in the Hall of Fame`}
              </p>
            )}
            <dl className="mt-5 grid grid-cols-3 gap-2 text-sm">
              <div className="bg-iron-800/70 py-2">
                <dt className="font-label text-parchment-500">Time</dt>
                <dd className="numeric text-parchment-100">{formatTime(entry.time)}</dd>
              </div>
              <div className="bg-iron-800/70 py-2">
                <dt className="font-label text-parchment-500">Trial</dt>
                <dd className="numeric text-parchment-100">×{difficultyInfo(difficulty).multiplier}</dd>
              </div>
              <div className="bg-iron-800/70 py-2">
                <dt className="font-label text-parchment-500">{weather.label}</dt>
                <dd className="numeric text-parchment-100">+{weather.bonus}</dd>
              </div>
            </dl>
          </>
        ) : (
          <p className="mt-6 text-parchment-300">
            You survived <span className="numeric text-parchment-100">{formatTime(survived)}</span>. Every maze is
            new — try another path.
          </p>
        )}

        <div className="mt-7 grid gap-2.5">
          <button ref={primary} type="button" className="btn btn-primary py-3 text-lg" onClick={onRetry}>
            <RotateCcw className="w-5 h-5" aria-hidden="true" />
            {won ? 'Run a new maze' : 'Try again'}
          </button>
          <button type="button" className="btn btn-ghost py-2.5" onClick={onExit}>
            <House className="w-4 h-4" aria-hidden="true" />
            Main menu
          </button>
        </div>
      </div>
    </div>
  );
};
