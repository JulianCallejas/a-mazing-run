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
    expect(storage.getItem(HIGH_SCORES_STORAGE_KEY)).toMatch(/^v2~/);
    expect(makeStore().getTopScores()).toEqual([entry]);
  });

  it('keeps only the top 20 scores sorted descending', () => {
    expect(MAX_HIGH_SCORES).toBe(20);
    const store = makeStore();
    for (let time = 1; time <= 24; time++) {
      store.saveScore({ time, optimalTime: 0.5, difficulty: 'MEDIUM', visualEffect: 'NONE' });
    }

    const scores = store.getTopScores();
    expect(scores).toHaveLength(MAX_HIGH_SCORES);
    expect(scores.map((s) => s.time)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
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

    for (let time = 1; time <= 20; time++) {
      store.saveScore({ time, optimalTime: 0.5, difficulty: 'MEDIUM', visualEffect: 'NONE' });
    }
    expect(store.isHighScore(38)).toBe(false);
    expect(store.isHighScore(39)).toBe(true);
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

  it('round-trips every field through the compact format, including treasure counts and a name', () => {
    const store = makeStore();
    const saved = store.saveScore({
      time: 61.234,
      optimalTime: 30.5,
      difficulty: 'VERY_HARD',
      visualEffect: 'SNOW',
      playerName: 'Ana-1',
      treasureBase: 400,
      treasuresFound: 3,
      treasuresTotal: 9,
    });
    const [read] = makeStore().getTopScores();
    expect(read).toEqual(saved);
    expect(read).toMatchObject({ time: 61.23, playerName: 'Ana-1' });
  });

  it('migrates scores saved as full JSON by older versions, then keeps them in the compact format', () => {
    storage.setItem(
      HIGH_SCORES_STORAGE_KEY,
      JSON.stringify([
        { id: 'old', score: 1, time: 10, optimalTime: 5, difficulty: 'MEDIUM', visualEffect: 'NONE', date: NOW.toISOString() },
      ]),
    );
    const store = makeStore();
    store.refresh();
    expect(storage.getItem(HIGH_SCORES_STORAGE_KEY)).toMatch(/^v2~old\*10\*5\*MEDIUM\*NONE\*/);
    expect(store.getTopScores()).toMatchObject([{ id: 'old', score: 750, date: NOW.toISOString() }]);
  });

  it('keeps 20 worst-case entries well under the 4 KB cookie limit', () => {
    const store = createHighScoreStore({
      storage,
      now: () => NOW,
      createId: () => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    });
    for (let i = 0; i < 25; i++) {
      store.saveScore({
        time: 100 + i,
        optimalTime: 50,
        difficulty: 'VERY_HARD',
        visualEffect: 'NONE',
        playerName: 'ÑÑÑÑÑÑÑÑÑÑÑÑÑÑÑÑÑÑÑÑ',
        treasureBase: 1650,
        treasuresFound: 9,
        treasuresTotal: 9,
      });
    }
    expect(store.getTopScores()).toHaveLength(20);
    expect(encodeURIComponent(storage.getItem(HIGH_SCORES_STORAGE_KEY) ?? '').length).toBeLessThan(4000);
  });

  it('stores names as cookie-safe tokens so they cannot break the separators', () => {
    const store = makeStore();
    store.saveScore({ time: 5, optimalTime: 5, difficulty: 'EASY', visualEffect: 'NONE', playerName: 'A~B*C D' });
    expect(makeStore().getTopScores()[0].playerName).toBe('A_B_C_D');
  });

  it('survives one corrupted entry without dropping the others', () => {
    storage.setItem(
      HIGH_SCORES_STORAGE_KEY,
      'v2~good*10*5*EASY*NONE*1764000000***~bad*10*5*EASY*NONE*99999999999999999***~junk',
    );
    expect(makeStore().getTopScores().map((e) => e.id)).toEqual(['good', 'bad']);
  });

  it('refresh leaves an empty store empty', () => {
    makeStore().refresh();
    expect(storage.getItem(HIGH_SCORES_STORAGE_KEY)).toBeNull();
  });

  it('clears all stored scores', () => {
    const store = makeStore();
    store.saveScore({ time: 10, optimalTime: 5, difficulty: 'MEDIUM', visualEffect: 'NONE' });
    store.clear();

    expect(store.getTopScores()).toEqual([]);
  });
});
