import type { VisualEffect } from '../core/scoring';

/** Normalized direction from the maze toward the moon (also the shadow light). */
export const MOON_DIRECTION: [number, number, number] = [-0.55, 0.62, -0.56];

/** Lighting and weather preset for each visual effect option. */
export interface Atmosphere {
  fog: { color: string; near: number; far: number };
  sky: { zenith: string; horizon: string; stars: number };
  moon: { color: string; intensity: number };
  hemisphere: { sky: string; ground: string; intensity: number };
  torch: { color: string; intensity: number };
  exposure: number;
  /** Multiplies floor roughness (wet floors are glossier). */
  floorRoughness: number;
  weather: 'none' | 'snow' | 'rain';
  lightning: boolean;
  /** Snow settles on wall tops, battlements and the outer ground. */
  snowCover: boolean;
}

export const ATMOSPHERES: Record<VisualEffect, Atmosphere> = {
  NONE: {
    fog: { color: '#0b1020', near: 16, far: 46 },
    sky: { zenith: '#04060f', horizon: '#1b2440', stars: 1 },
    moon: { color: '#a9bcff', intensity: 1.5 },
    hemisphere: { sky: '#6a7cab', ground: '#2e241b', intensity: 0.85 },
    torch: { color: '#ff9a4a', intensity: 5 },
    exposure: 1.05,
    floorRoughness: 1,
    weather: 'none',
    lightning: false,
    snowCover: false,
  },
  FOG: {
    fog: { color: '#1c222b', near: 2.5, far: 15 },
    sky: { zenith: '#151a22', horizon: '#2a313c', stars: 0 },
    moon: { color: '#9aa7bd', intensity: 0.55 },
    hemisphere: { sky: '#7b8797', ground: '#2e2820', intensity: 0.9 },
    torch: { color: '#ffa055', intensity: 6 },
    exposure: 1.1,
    floorRoughness: 0.95,
    weather: 'none',
    lightning: false,
    snowCover: false,
  },
  SNOW: {
    fog: { color: '#7d8aa0', near: 8, far: 32 },
    sky: { zenith: '#3a4458', horizon: '#8d9ab0', stars: 0 },
    moon: { color: '#d8e4ff', intensity: 1.3 },
    hemisphere: { sky: '#c3d0e6', ground: '#4a4744', intensity: 0.8 },
    torch: { color: '#ffa860', intensity: 4.5 },
    exposure: 1.0,
    floorRoughness: 1,
    weather: 'snow',
    lightning: false,
    snowCover: true,
  },
  RAIN: {
    fog: { color: '#10161f', near: 5, far: 24 },
    sky: { zenith: '#05080d', horizon: '#1a2330', stars: 0 },
    moon: { color: '#8fa3c2', intensity: 0.6 },
    hemisphere: { sky: '#4a5b78', ground: '#1a1611', intensity: 0.7 },
    torch: { color: '#ff9445', intensity: 5.5 },
    exposure: 1.1,
    floorRoughness: 0.45,
    weather: 'rain',
    lightning: true,
    snowCover: false,
  },
};
