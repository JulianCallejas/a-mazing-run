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

/**
 * Opens a native modal <dialog>: the browser makes the page inert, contains focus and
 * renders it in the top layer. Focus then moves to the primary action.
 */
const useModalDialog = () => {
  const dialog = useRef<HTMLDialogElement>(null);
  const primary = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const el = dialog.current;
    if (el && !el.open) el.showModal();
    primary.current?.focus();
  }, []);
  return { dialog, primary };
};

const DIALOG_CLASS =
  'scrim fixed inset-0 z-20 m-0 h-dvh w-dvw max-h-none max-w-none items-center justify-center bg-transparent p-4 text-inherit open:flex';

export const PauseOverlay = ({ soundEnabled, onResume, onRestart, onToggleSound, onExit }: PauseOverlayProps) => {
  const { dialog, primary } = useModalDialog();
  return (
    <dialog ref={dialog} className={DIALOG_CLASS} aria-labelledby="pause-title" onCancel={(e) => { e.preventDefault(); onResume(); }}>
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
    </dialog>
  );
};

/** Animates a number from 0 to `target` over `duration` ms (ease-out). */
const useCountUp = (target: number, duration = 1100) => {
  const [value, setValue] = useState(0);
  const [reduceMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    if (reduceMotion) return;
    let frame = 0;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      setValue(Math.round(target * (1 - (1 - t) ** 3)));
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, duration, reduceMotion]);
  return reduceMotion ? target : value;
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
  const { dialog, primary } = useModalDialog();
  const score = useCountUp(entry?.score ?? 0);
  const won = outcome === 'won';
  const weather = weatherInfo(effect);

  return (
    <dialog ref={dialog} className={`${DIALOG_CLASS} animate-reveal`} aria-labelledby="result-title" onCancel={(e) => e.preventDefault()}>
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
            <dl className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
              <div className="bg-iron-800/70 py-2">
                <dt className="font-label text-parchment-500">Time</dt>
                <dd className="numeric text-parchment-100">{formatTime(entry.time)}</dd>
              </div>
              <div className="bg-iron-800/70 py-2">
                <dt className="font-label text-parchment-500">Efficiency</dt>
                <dd className="numeric text-parchment-100">
                  {Math.round(Math.min(1, entry.optimalTime / entry.time) * 100)}%
                </dd>
              </div>
              <div className="bg-iron-800/70 py-2">
                <dt className="font-label text-parchment-500">Trial</dt>
                <dd className="numeric text-parchment-100">×{difficultyInfo(difficulty).multiplier}</dd>
              </div>
              <div className="bg-iron-800/70 py-2">
                <dt className="font-label text-parchment-500">{weather.label}</dt>
                <dd className="numeric text-parchment-100">×{weather.multiplier}</dd>
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
    </dialog>
  );
};
