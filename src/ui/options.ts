import { CloudFog, CloudRain, Moon, Snowflake, type LucideIcon } from 'lucide-react';
import { GAME_CONFIG } from '../utils/constants';
import type { Difficulty, VisualEffect } from '../game/core/scoring';

/** Display metadata derived from GAME_CONFIG so UI never restates game rules. */
export const DIFFICULTY_ORDER: Difficulty[] = ['EASY', 'MEDIUM', 'HARD', 'VERY_HARD'];

export const difficultyInfo = (difficulty: Difficulty) => {
  const config = GAME_CONFIG.DIFFICULTY[difficulty];
  return {
    label: config.name,
    guardians: config.enemyCount,
    speedPercent: Math.round(config.speedMultiplier * 100),
    size: config.mazeSize,
    multiplier: GAME_CONFIG.SCORING.MULTIPLIERS[difficulty],
  };
};

export const WEATHER_ORDER: VisualEffect[] = ['NONE', 'FOG', 'SNOW', 'RAIN'];

const WEATHER_PRESENTATION: Record<VisualEffect, { label: string; icon: LucideIcon }> = {
  NONE: { label: 'Clear Night', icon: Moon },
  FOG: { label: 'Fog', icon: CloudFog },
  SNOW: { label: 'Snowfall', icon: Snowflake },
  RAIN: { label: 'Storm', icon: CloudRain },
};

export const weatherInfo = (effect: VisualEffect) => ({
  ...WEATHER_PRESENTATION[effect],
  multiplier: GAME_CONFIG.VISUAL_EFFECTS[effect].multiplier,
});
