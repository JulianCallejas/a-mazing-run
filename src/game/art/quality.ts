/**
 * Render quality tier, decided once at startup. Touch-first or narrow
 * devices get the mobile tier to stay inside the mobile render budget
 * (<= 150 draw calls): no shadows on secondary props, no bloom pass, lower
 * shadow-map resolution and a DPR cap.
 */
export interface QualityTier {
  name: 'desktop' | 'mobile';
  maxDpr: number;
  shadowMapSize: number;
  /** Merlons, torches, perimeter trees/rocks cast shadows. */
  propShadows: boolean;
  bloom: boolean;
}

const detect = (): QualityTier => {
  let mobile: boolean;
  try {
    mobile = window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 700;
  } catch {
    mobile = false;
  }
  return mobile
    ? { name: 'mobile', maxDpr: 1.5, shadowMapSize: 1024, propShadows: false, bloom: false }
    : { name: 'desktop', maxDpr: 2, shadowMapSize: 2048, propShadows: true, bloom: true };
};

export const QUALITY: QualityTier = typeof window === 'undefined'
  ? { name: 'desktop', maxDpr: 2, shadowMapSize: 2048, propShadows: true, bloom: true }
  : detect();
