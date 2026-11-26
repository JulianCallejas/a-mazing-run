import { beforeEach, describe, expect, it } from 'vitest';
import {
  HIGH_SCORES_STORAGE_KEY,
  MAX_HIGH_SCORES,
  createHighScoreStore,
  type KeyValueStorage,
} from './highScores';

class MemoryStorage implements KeyValueStorage {
  data = new Map<string, string>();
  getItem(key: string) {
    return this.data.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.data.set(key, value);
  }
  removeItem(key: string) {
    this.data.delete(key);
  }
}

const NOW = new Date('2026-11-18T12:00:00.000Z');

describe('high score store', () => {
  let storage: MemoryStorage;
  let ids: number;

  beforeEach(() => {
    storage = new MemoryStorage();
    ids = 0;
  });

  const makeStore = () =>
    createHighScoreStore({ storage, now: () => NOW, createId: () => `id-${++ids}` });

  it('saves a winning run with its score and persists it under the legacy key', () => {
    const entry = makeStore().saveScore({ time: 50, optimalTime: 25, difficulty: 'EASY', visualEffect: 'FOG' });

    expect(entry).toEqual({
      id: 'id-1',
      score: 625,
      time: 50,
      optimalTime: 25,
      difficulty: 'EASY',
      visualEffect: 'FOG',
      date: NOW.toISOString(),
    });
    expect(JSON.parse(storage.getItem(HIGH_SCORES_STORAGE_KEY) ?? '[]')).toEqual([entry]);
  });

  it('keeps only the top 10 scores sorted descending', () => {
    const store = makeStore();
    for (let time = 1; time <= 12; time++) {
      store.saveScore({ time, optimalTime: 0.5, difficulty: 'MEDIUM', visualEffect: 'NONE' });
    }

    const scores = store.getTopScores();
    expect(scores).toHaveLength(MAX_HIGH_SCORES);
    expect(scores.map((s) => s.time)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it('discards entries saved before the efficiency formula (no optimalTime)', () => {
    const legacy = [
      {
        id: '1700000000000-0.5',
        score: 200,
        time: 5,
        difficulty: 'HARD',
        visualEffect: 'NONE',
        date: '2025-01-01T00:00:00.000Z',
        playerName: 'Ana',
      },
    ];
    storage.setItem(HIGH_SCORES_STORAGE_KEY, JSON.stringify(legacy));

    expect(makeStore().getTopScores()).toEqual([]);
  });

  it('recomputes stored scores from time, optimal time and settings on read', () => {
    storage.setItem(
      HIGH_SCORES_STORAGE_KEY,
      JSON.stringify([
        { id: 'a', score: 1, time: 10, optimalTime: 5, difficulty: 'HARD', visualEffect: 'NONE', date: 'd' },
      ]),
    );
    expect(makeStore().getTopScores()[0].score).toBe(1400);
  });

  it('ignores corrupted JSON and malformed entries instead of crashing', () => {
    storage.setItem(HIGH_SCORES_STORAGE_KEY, '{not json');
    expect(makeStore().getTopScores()).toEqual([]);

    storage.setItem(
      HIGH_SCORES_STORAGE_KEY,
      JSON.stringify([
        { id: 'ok', score: 10, time: 100, optimalTime: 50, difficulty: 'EASY', visualEffect: 'NONE', date: 'd' },
        { id: 'bad-difficulty', score: 10, time: 1, difficulty: 'GOD', visualEffect: 'NONE', date: 'd' },
        { id: 'bad-score', score: 'lots', time: 1, difficulty: 'EASY', visualEffect: 'NONE', date: 'd' },
        null,
      ]),
    );
    expect(makeStore().getTopScores().map((s) => s.id)).toEqual(['ok']);
  });

  it('reports whether a score would enter the table', () => {
    const store = makeStore();
    expect(store.isHighScore(1)).toBe(true);

    for (let time = 1; time <= 10; time++) {
      store.saveScore({ time, optimalTime: 0.5, difficulty: 'MEDIUM', visualEffect: 'NONE' });
    }
    expect(store.isHighScore(75)).toBe(false);
    expect(store.isHighScore(76)).toBe(true);
  });

  it('keeps working when storage throws (private mode / quota)', () => {
    const failing: KeyValueStorage = {
      getItem: () => {
        throw new Error('denied');
      },
      setItem: () => {
        throw new Error('quota');
      },
      removeItem: () => undefined,
    };
    const store = createHighScoreStore({ storage: failing, now: () => NOW, createId: () => 'x' });

    expect(store.getTopScores()).toEqual([]);
    expect(store.saveScore({ time: 10, optimalTime: 5, difficulty: 'MEDIUM', visualEffect: 'NONE' }).score).toBe(750);
  });

  it('adds treasure points to the score and keeps the treasure counts', () => {
    const entry = makeStore().saveScore({
      time: 10,
      optimalTime: 5,
      difficulty: 'MEDIUM',
      visualEffect: 'NONE',
      treasureBase: 150,
      treasuresFound: 2,
      treasuresTotal: 5,
    });
    expect(entry.score).toBe(750 + 225);
    expect(entry).toMatchObject({ treasureBase: 150, treasuresFound: 2, treasuresTotal: 5 });
  });

  it('keeps legacy entries without treasure fields, recomputed with 0 treasure points', () => {
    storage.setItem(
      HIGH_SCORES_STORAGE_KEY,
      JSON.stringify([
        { id: 'old', score: 1, time: 10, optimalTime: 5, difficulty: 'MEDIUM', visualEffect: 'NONE', date: 'd' },
      ]),
    );
    const [entry] = makeStore().getTopScores();
    expect(entry.score).toBe(750);
    expect(entry.treasureBase).toBeUndefined();
  });

  it('clears all stored scores', () => {
    const store = makeStore();
    store.saveScore({ time: 10, optimalTime: 5, difficulty: 'MEDIUM', visualEffect: 'NONE' });
    store.clear();

    expect(store.getTopScores()).toEqual([]);
  });
});
