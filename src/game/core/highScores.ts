import { GAME_CONFIG } from '../../utils/constants';
import { createCookieStorage, createReplicatedStorage } from '../../utils/persistentStorage';
import { calculateScore, type Difficulty, type VisualEffect } from './scoring';

/** Entries saved before the efficiency formula lack `optimalTime` and are discarded on read. */
export const HIGH_SCORES_STORAGE_KEY = 'amazing-run-scores';
export const MAX_HIGH_SCORES = 20;

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

const COMPACT_PREFIX = 'v2~';
const ENTRY_SEPARATOR = '~';
const FIELD_SEPARATOR = '*';
const MAX_NAME_LENGTH = 12;

const round2 = (n: number) => Math.round(n * 100) / 100;
/** Characters that survive cookie encoding untouched and cannot clash with the separators. */
const safeToken = (text: string) => text.replace(/[^A-Za-z0-9._-]/g, '_');

/**
 * Compact text form used for persistence, small enough for 20 entries to fit
 * a cookie (~4 KB): `v2~` then entries joined by `~`, fields by `*`:
 * id, time, optimalTime, difficulty, visualEffect, epoch seconds, treasureBase,
 * treasuresFound, treasuresTotal, name (ASCII letters, digits and `._-`, 12 max). The score is not stored: it is
 * recomputed from the other fields on read, like the rest of the formula.
 */
export const encodeScores = (entries: ScoreEntry[]): string =>
  COMPACT_PREFIX +
  entries
    .map((e) =>
      [
        safeToken(e.id),
        round2(e.time),
        round2(e.optimalTime),
        e.difficulty,
        e.visualEffect,
        Math.floor(Date.parse(e.date) / 1000) || 0,
        e.treasureBase ?? '',
        e.treasuresFound ?? '',
        e.treasuresTotal ?? '',
        e.playerName ? safeToken(e.playerName.slice(0, MAX_NAME_LENGTH)) : '',
      ].join(FIELD_SEPARATOR),
    )
    .join(ENTRY_SEPARATOR);

const optionalCount = (field: string | undefined): number | undefined =>
  field === undefined || field === '' ? undefined : Number(field);

const fromCompact = (text: string): unknown => {
  const [id, time, optimalTime, difficulty, visualEffect, seconds, base, found, total, name] =
    text.split(FIELD_SEPARATOR);
  const epoch = Number(seconds);
  const date = new Date(epoch * 1000);
  return {
    id,
    score: 0, // recomputed by rescore()
    time: Number(time),
    optimalTime: Number(optimalTime),
    difficulty,
    visualEffect,
    date: seconds !== '' && !Number.isNaN(date.getTime()) ? date.toISOString() : '',
    playerName: name || undefined,
    treasureBase: optionalCount(base),
    treasuresFound: optionalCount(found),
    treasuresTotal: optionalCount(total),
  };
};

/** Parses the compact form or the legacy JSON array of full entries; invalid input yields no entries. */
export const decodeScores = (raw: string): ScoreEntry[] => {
  const candidates: unknown[] = raw.startsWith(COMPACT_PREFIX)
    ? raw.slice(COMPACT_PREFIX.length).split(ENTRY_SEPARATOR).filter(Boolean).map(fromCompact)
    : (() => {
        const parsed: unknown = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      })();
  return candidates.map(toScoreEntry).filter((e): e is ScoreEntry => e !== null);
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
      return decodeScores(raw)
        .map(rescore)
        .sort(byScoreDesc)
        .slice(0, MAX_HIGH_SCORES);
    } catch {
      return [];
    }
  };

  const write = (entries: ScoreEntry[]): void => {
    try {
      storage?.setItem(HIGH_SCORES_STORAGE_KEY, encodeScores(entries));
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
        score: calculateScore(
          round2(run.time),
          round2(run.optimalTime),
          run.difficulty,
          run.visualEffect,
          run.treasureBase ?? 0,
        ),
        time: round2(run.time),
        optimalTime: round2(run.optimalTime),
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

    /** Rewrites the stored scores so cookie expiry is renewed on every visit. */
    refresh(): void {
      const scores = read();
      if (scores.length > 0) write(scores);
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
    if (typeof window === 'undefined') return null;
    return createReplicatedStorage(
      [
        createCookieStorage({
          doc: document,
          path: import.meta.env.BASE_URL,
          secure: window.location.protocol === 'https:',
        }),
        window.localStorage,
      ],
      // A damaged cookie must not hide intact scores in localStorage.
      (raw) => decodeScores(raw).length > 0,
    );
  } catch {
    return null;
  }
};

/** App-wide store: a long-lived cookie, mirrored to localStorage (which also holds pre-cookie scores). */
export const highScores = createHighScoreStore({ storage: browserStorage() });
highScores.refresh();
