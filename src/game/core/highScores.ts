import { GAME_CONFIG } from '../../utils/constants';
import { calculateScore, type Difficulty, type VisualEffect } from './scoring';

/** Entries saved before the efficiency formula lack `optimalTime` and are discarded on read. */
export const HIGH_SCORES_STORAGE_KEY = 'amazing-run-scores';
export const MAX_HIGH_SCORES = 10;

export interface ScoreEntry {
  id: string;
  score: number;
  time: number;
  /** Fastest possible escape of that maze, in seconds. */
  optimalTime: number;
  difficulty: Difficulty;
  visualEffect: VisualEffect;
  date: string;
  playerName?: string;
  /** Treasure base points collected (before multipliers); absent on entries saved before treasures. */
  treasureBase?: number;
  treasuresFound?: number;
  treasuresTotal?: number;
}

export interface FinishedRun {
  time: number;
  optimalTime: number;
  difficulty: Difficulty;
  visualEffect: VisualEffect;
  playerName?: string;
  treasureBase?: number;
  treasuresFound?: number;
  treasuresTotal?: number;
}

/** Minimal subset of the Web Storage API, injectable for tests. */
export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface HighScoreStoreDeps {
  storage: KeyValueStorage | null;
  now?: () => Date;
  createId?: () => string;
}

const isDifficulty = (value: unknown): value is Difficulty =>
  typeof value === 'string' && Object.prototype.hasOwnProperty.call(GAME_CONFIG.DIFFICULTY, value);

const isVisualEffect = (value: unknown): value is VisualEffect =>
  typeof value === 'string' && Object.prototype.hasOwnProperty.call(GAME_CONFIG.VISUAL_EFFECTS, value);

/** Validates untrusted persisted data; returns a clean copy or null. */
const toScoreEntry = (value: unknown): ScoreEntry | null => {
  if (typeof value !== 'object' || value === null) return null;
  const v = value as Record<string, unknown>;
  if (
    typeof v.id !== 'string' ||
    typeof v.score !== 'number' ||
    !Number.isFinite(v.score) ||
    typeof v.time !== 'number' ||
    !Number.isFinite(v.time) ||
    typeof v.optimalTime !== 'number' ||
    !Number.isFinite(v.optimalTime) ||
    v.optimalTime <= 0 ||
    !isDifficulty(v.difficulty) ||
    !isVisualEffect(v.visualEffect) ||
    typeof v.date !== 'string'
  ) {
    return null;
  }
  const entry: ScoreEntry = {
    id: v.id,
    score: v.score,
    time: v.time,
    optimalTime: v.optimalTime,
    difficulty: v.difficulty,
    visualEffect: v.visualEffect,
    date: v.date,
  };
  if (typeof v.playerName === 'string') entry.playerName = v.playerName;
  const count = (n: unknown) => (typeof n === 'number' && Number.isFinite(n) && n >= 0 ? n : undefined);
  const treasureBase = count(v.treasureBase);
  const treasuresFound = count(v.treasuresFound);
  const treasuresTotal = count(v.treasuresTotal);
  if (treasureBase !== undefined) entry.treasureBase = treasureBase;
  if (treasuresFound !== undefined) entry.treasuresFound = treasuresFound;
  if (treasuresTotal !== undefined) entry.treasuresTotal = treasuresTotal;
  return entry;
};

/** Scores are derived from time + settings, so recompute to follow the current formula. */
const rescore = (entry: ScoreEntry): ScoreEntry =>
  entry.time > 0
    ? {
        ...entry,
        score: calculateScore(
          entry.time,
          entry.optimalTime,
          entry.difficulty,
          entry.visualEffect,
          entry.treasureBase ?? 0,
        ),
      }
    : entry;

const byScoreDesc = (a: ScoreEntry, b: ScoreEntry) => b.score - a.score;

export const createHighScoreStore = ({
  storage,
  now = () => new Date(),
  createId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
}: HighScoreStoreDeps) => {
  const read = (): ScoreEntry[] => {
    try {
      const raw = storage?.getItem(HIGH_SCORES_STORAGE_KEY);
      if (!raw) return [];
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .map(toScoreEntry)
        .filter((e): e is ScoreEntry => e !== null)
        .map(rescore)
        .sort(byScoreDesc)
        .slice(0, MAX_HIGH_SCORES);
    } catch {
      return [];
    }
  };

  const write = (entries: ScoreEntry[]): void => {
    try {
      storage?.setItem(HIGH_SCORES_STORAGE_KEY, JSON.stringify(entries));
    } catch {
      // Storage can be unavailable (private mode, quota). Scores are a
      // convenience, so the run result is still returned to the caller.
    }
  };

  return {
    getTopScores: read,

    saveScore(run: FinishedRun): ScoreEntry {
      const entry: ScoreEntry = {
        id: createId(),
        score: calculateScore(run.time, run.optimalTime, run.difficulty, run.visualEffect, run.treasureBase ?? 0),
        time: run.time,
        optimalTime: run.optimalTime,
        difficulty: run.difficulty,
        visualEffect: run.visualEffect,
        date: now().toISOString(),
      };
      if (run.playerName) entry.playerName = run.playerName;
      if (run.treasureBase !== undefined) entry.treasureBase = run.treasureBase;
      if (run.treasuresFound !== undefined) entry.treasuresFound = run.treasuresFound;
      if (run.treasuresTotal !== undefined) entry.treasuresTotal = run.treasuresTotal;

      write([...read(), entry].sort(byScoreDesc).slice(0, MAX_HIGH_SCORES));
      return entry;
    },

    isHighScore(score: number): boolean {
      const scores = read();
      return scores.length < MAX_HIGH_SCORES || score > scores[scores.length - 1].score;
    },

    clear(): void {
      try {
        storage?.removeItem(HIGH_SCORES_STORAGE_KEY);
      } catch {
        // Nothing to clear when storage is unavailable.
      }
    },
  };
};

export type HighScoreStore = ReturnType<typeof createHighScoreStore>;

const browserStorage = (): KeyValueStorage | null => {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
};

/** App-wide store backed by localStorage. */
export const highScores = createHighScoreStore({ storage: browserStorage() });
