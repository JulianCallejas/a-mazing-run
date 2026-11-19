/** A deterministic pseudo-random generator returning floats in [0, 1). */
export type RandomSource = () => number;

/**
 * Mulberry32: tiny, fast and good enough for level generation. The same seed
 * always yields the same sequence, which makes mazes reproducible in tests.
 */
export const createRandom = (seed: number): RandomSource => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export const randomSeed = (): number => Math.floor(Math.random() * 0xffffffff);

/** In-place Fisher-Yates shuffle driven by the given random source. */
export const shuffle = <T>(items: T[], random: RandomSource): T[] => {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
};
