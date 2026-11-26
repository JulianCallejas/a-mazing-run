import { CylinderGeometry, IcosahedronGeometry, OctahedronGeometry } from 'three';
import type { TreasureBuilder } from './kit';

/** Crystalline ice bloom: two rings of faceted petals around a bright core; petals shimmer in turn. */
export const buildFrostFlower: TreasureBuilder = (kit) => {
  const ice = kit.surface({
    color: '#d8f6ff',
    metalness: 0.2,
    roughness: 0.08,
    emissive: '#5fc8e6',
    emissiveIntensity: 0.3,
    opacity: 0.82,
    flatShading: true,
  });
  const outerGlow = kit.glow('#9be9ff', 1.3, { opacity: 0.85 });
  const innerGlow = kit.glow('#c8f6ff', 1.3, { opacity: 0.9 });
  const heart = kit.glow('#e8fdff', 2.6);

  const bloom = kit.pivot(kit.body, 'bloom', 0, -0.03, 0);
  const addRing = (count: number, length: number, tilt: number, offset: number, material: typeof ice) => {
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + offset;
      // Petals sit directly in `bloom` (no per-petal pivot) so each ring merges into one draw call.
      const petal = kit.add(bloom, new OctahedronGeometry(0.03, 0), material, 'petal');
      petal.scale.set(0.8, 0.45, length / 0.06);
      petal.rotation.set(-tilt, angle, 0, 'YXZ');
      const reach = Math.cos(tilt) * length * 0.5;
      petal.position.set(Math.sin(angle) * reach, Math.sin(tilt) * length * 0.5, Math.cos(angle) * reach);
    }
  };
  addRing(6, 0.2, 0.45, 0, ice);
  addRing(6, 0.17, 0.5, Math.PI / 6, outerGlow);
  addRing(5, 0.11, 0.95, 0.3, innerGlow);
  kit.add(bloom, new IcosahedronGeometry(0.028, 0), heart, 'heart').position.y = 0.03;

  // Short frozen stalk anchoring the bloom.
  const stalk = kit.add(kit.body, new CylinderGeometry(0.008, 0.014, 0.12, 5), ice, 'stalk');
  stalk.position.y = -0.1;

  kit.addMotes('#d8f8ff', 0.2);

  return {
    accent: '#9be9ff',
    animate: (t) => {
      // Shimmer travels between the petal rings.
      kit.setLevel(outerGlow, 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 1.7)));
      kit.setLevel(innerGlow, 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 1.7 + 2.1)));
      kit.setLevel(heart, 0.8 + 0.2 * Math.sin(t * 3.1));
      kit.float.position.y = 0.27 + Math.sin(t * 1.1) * 0.02;
      kit.body.rotation.y = t * 0.3;
      kit.animateMotes(t);
    },
  };
};
