import type { VisualEffect } from '../game/core/scoring';

/** Equal-tempered frequency for a semitone offset from A4 = 440 Hz. */
export const noteFrequency = (semitonesFromA4: number): number => 440 * 2 ** (semitonesFromA4 / 12);

/** Danger below this level produces no heartbeat. */
export const HEARTBEAT_THRESHOLD = 0.1;

/**
 * Seconds between heartbeats for a 0..1 danger level, or null when calm.
 * Linear from 1.1 s (just threatened) down to 0.42 s (guardian at arm's reach).
 */
export const heartbeatInterval = (danger: number): number | null => {
  if (!(danger > HEARTBEAT_THRESHOLD)) return null;
  const t = Math.min(1, (danger - HEARTBEAT_THRESHOLD) / (1 - HEARTBEAT_THRESHOLD));
  return 1.1 - t * (1.1 - 0.42);
};

export interface WeatherMix {
  /** Drone (music bed) gain. */
  drone: number;
  /** Wind/rain noise bed gain, 0..1. */
  noise: number;
  /** Noise high-pass cutoff in Hz: higher reads as rain hiss, lower as wind. */
  noiseHighpass: number;
  /** Noise low-pass cutoff in Hz. */
  noiseLowpass: number;
}

const MIXES: Record<VisualEffect, WeatherMix> = {
  NONE: { drone: 0.5, noise: 0.12, noiseHighpass: 120, noiseLowpass: 700 },
  FOG: { drone: 0.6, noise: 0.08, noiseHighpass: 80, noiseLowpass: 400 },
  SNOW: { drone: 0.45, noise: 0.22, noiseHighpass: 200, noiseLowpass: 1200 },
  RAIN: { drone: 0.4, noise: 0.42, noiseHighpass: 900, noiseLowpass: 7000 },
};

export const weatherMix = (effect: VisualEffect): WeatherMix => MIXES[effect];
