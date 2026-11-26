import { LatheGeometry, RingGeometry, SphereGeometry, Vector2 } from 'three';
import type { TreasureBuilder } from './kit';

/** Teardrop profile: round belly, pointed tip, base at y = 0. */
const DROP_PROFILE = Array.from({ length: 13 }, (_, i) => {
  const a = (i / 12) * Math.PI; // 0 = bottom, PI = tip
  const belly = Math.sin(a) * (1 - a / Math.PI) ** 0.6;
  return new Vector2(belly * 0.11, (1 - Math.cos(a)) * 0.13);
});

const RIPPLE_PERIOD = 2.2;

/** Large pearl-like raindrop with a blue sheen, and a ripple ring spreading on the floor below. */
export const buildRaindrop: TreasureBuilder = (kit) => {
  const pearl = kit.surface({
    color: '#d6eaff',
    metalness: 0.25,
    roughness: 0.06,
    emissive: '#3f8fe0',
    emissiveIntensity: 0.35,
    opacity: 0.9,
  });
  const core = kit.glow('#6fc3ff', 2.4);
  const ripple = kit.light('#7cc8ff', 0.7);

  const drop = kit.add(kit.body, new LatheGeometry(DROP_PROFILE, 16), pearl, 'drop');
  drop.position.y = -0.11;
  const glowCore = kit.add(kit.body, new SphereGeometry(0.035, 10, 8), core, 'core');
  glowCore.position.y = -0.06;

  // Ripple lives on the floor (root space), independent of the bob.
  const ring = kit.add(kit.root, new RingGeometry(0.08, 0.1, 28), ripple, 'ripple');
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.02;

  kit.addMotes('#a8dcff', 0.19);

  return {
    accent: '#6fc3ff',
    keep: [glowCore, ring],
    animate: (t) => {
      kit.setLevel(core, 0.7 + 0.3 * Math.sin(t * 2.3));
      kit.float.position.y = 0.3 + Math.sin(t * 1.6) * 0.03;
      kit.body.rotation.y = t * 0.35;
      const phase = (t % RIPPLE_PERIOD) / RIPPLE_PERIOD;
      ring.scale.setScalar(0.6 + phase * 2.2);
      kit.setLevel(ripple, 1 - phase);
      kit.animateMotes(t);
    },
  };
};
