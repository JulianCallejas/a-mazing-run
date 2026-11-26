import { SphereGeometry, type Mesh } from 'three';
import type { TreasureBuilder } from './kit';

const TAIL_LENGTH = 5;

/** Drift path of the wisp around its cell centre (local units). */
const drift = (t: number) => ({
  x: Math.sin(t * 0.55) * 0.08,
  y: Math.sin(t * 1.3) * 0.035,
  z: Math.sin(t * 0.8 + 1) * 0.08,
});

/** Pale violet-white wisp orb drifting in slow loops, a fading tail trailing behind it. */
export const buildMistWisp: TreasureBuilder = (kit) => {
  const orb = kit.glow('#efe6ff', 2.2, { opacity: 0.95 });
  const halo = kit.light('#c9b4ff', 0.35);
  const tailMaterial = kit.light('#d9c8ff', 0.55);

  const core = kit.add(kit.body, new SphereGeometry(0.055, 14, 10), orb, 'orb');
  const aura = kit.add(kit.body, new SphereGeometry(0.1, 14, 10), halo, 'aura');

  // Tail puffs live in the float frame and replay the orb's past positions.
  const tail: Mesh[] = [];
  for (let i = 0; i < TAIL_LENGTH; i++) {
    const puff = kit.add(kit.float, new SphereGeometry(0.04 * (1 - i / (TAIL_LENGTH + 1)), 8, 6), tailMaterial, 'tail');
    tail.push(puff);
  }

  kit.addMotes('#e6dcff', 0.24);

  return {
    accent: '#c9b4ff',
    keep: [core, aura, ...tail],
    animate: (t) => {
      const head = drift(t);
      kit.body.position.set(head.x, head.y, head.z);
      tail.forEach((puff, i) => {
        const past = drift(t - (i + 1) * 0.16);
        puff.position.set(past.x, past.y - (i + 1) * 0.006, past.z);
      });
      const breathe = 0.5 + 0.5 * Math.sin(t * 1.9);
      kit.setLevel(orb, 0.75 + breathe * 0.35);
      aura.scale.setScalar(0.9 + breathe * 0.25);
      kit.float.position.y = 0.32;
      kit.animateMotes(t);
    },
  };
};
