import { describe, expect, it } from 'vitest';
import { heartbeatInterval, noteFrequency, weatherMix } from './audioMath';

describe('noteFrequency', () => {
  it('maps semitone offsets from A4 (440 Hz) to equal-tempered frequencies', () => {
    expect(noteFrequency(0)).toBeCloseTo(440);
    expect(noteFrequency(12)).toBeCloseTo(880);
    expect(noteFrequency(-12)).toBeCloseTo(220);
    expect(noteFrequency(-7)).toBeCloseTo(293.66, 1); // D4
  });
});

describe('heartbeatInterval', () => {
  it('is silent (null) below the danger threshold', () => {
    expect(heartbeatInterval(0)).toBeNull();
    expect(heartbeatInterval(0.05)).toBeNull();
  });

  it('beats faster as danger rises, clamped between 0.42 s and 1.1 s', () => {
    const calm = heartbeatInterval(0.15)!;
    const close = heartbeatInterval(0.9)!;
    expect(calm).toBeGreaterThan(close);
    expect(heartbeatInterval(1)).toBeCloseTo(0.42);
    expect(calm).toBeLessThanOrEqual(1.1);
    expect(heartbeatInterval(5)).toBeCloseTo(0.42);
  });
});

describe('weatherMix', () => {
  it('returns ambience gains per weather with rain as the loudest noise bed', () => {
    const clear = weatherMix('NONE');
    const rain = weatherMix('RAIN');
    expect(rain.noise).toBeGreaterThan(clear.noise);
    expect(rain.noiseHighpass).toBeGreaterThan(clear.noiseHighpass);
    for (const effect of ['NONE', 'FOG', 'SNOW', 'RAIN'] as const) {
      const mix = weatherMix(effect);
      expect(mix.drone).toBeGreaterThan(0);
      expect(mix.noise).toBeGreaterThanOrEqual(0);
      expect(mix.noise).toBeLessThanOrEqual(1);
    }
  });
});
