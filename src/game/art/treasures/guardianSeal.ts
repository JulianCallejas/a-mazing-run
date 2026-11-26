import { BoxGeometry, CylinderGeometry, DoubleSide, TorusGeometry } from 'three';
import type { TreasureBuilder } from './kit';

/** Matches the guardians' bronze, dark armour and threat-red rune (see characters/guardian.ts). */
const GUARDIAN_RED = '#ff2a1a';

/**
 * Cracked bronze medallion bearing the guardians' T-visor sigil; red light
 * seeps through the crack and the sigil throbs like a waking guardian.
 */
export const buildGuardianSeal: TreasureBuilder = (kit) => {
  const bronze = kit.surface({ color: '#7a5a2e', metalness: 0.9, roughness: 0.35, side: DoubleSide });
  const armorDark = kit.surface({ color: '#25272d', metalness: 0.8, roughness: 0.55 });
  const sigil = kit.glow(GUARDIAN_RED, 2.6);

  const medal = kit.pivot(kit.body, 'medal');
  medal.rotation.x = Math.PI / 2; // faces ±z

  // Two halves split along a slanted crack, nudged apart.
  const crack = 0.35;
  const halves: Array<[number, number, number]> = [
    // thetaStart, thetaLength, offset along the crack normal
    [crack, Math.PI, 0.008],
    [crack + Math.PI, Math.PI, -0.008],
  ];
  for (const [start, length, offset] of halves) {
    const half = kit.pivot(medal, 'half');
    half.position.set(Math.cos(crack) * offset, 0, -Math.sin(crack) * offset);
    kit.add(half, new CylinderGeometry(0.135, 0.135, 0.03, 20, 1, false, start, length), bronze, 'disc');
    const rim = kit.add(half, new TorusGeometry(0.135, 0.014, 6, 12, length), armorDark, 'rim');
    // Torus arcs start at +x in their own plane; align the arc with the half's theta range.
    rim.rotation.set(Math.PI / 2, 0, Math.PI / 2 - start - length);
  }

  // Red seam inside the crack.
  const seam = kit.add(medal, new BoxGeometry(0.006, 0.022, 0.26), sigil, 'seam');
  seam.rotation.y = crack;

  // T-visor sigil on both faces.
  for (const side of [-1, 1]) {
    const bar = kit.add(medal, new BoxGeometry(0.15, 0.006, 0.02), sigil, 'visorBar');
    bar.position.set(0, side * 0.016, -0.03);
    const stem = kit.add(medal, new BoxGeometry(0.02, 0.006, 0.1), sigil, 'visorStem');
    stem.position.set(0, side * 0.016, 0.025);
  }

  kit.addMotes('#ff6a3a');

  return {
    accent: GUARDIAN_RED,
    animate: (t) => {
      const throb = 0.5 + 0.5 * Math.sin(t * 2.6);
      kit.setLevel(sigil, 0.5 + throb * throb * 0.9);
      kit.float.position.y = 0.28 + Math.sin(t * 1.2) * 0.02;
      kit.body.rotation.y = t * 0.45;
      kit.animateMotes(t);
    },
  };
};
