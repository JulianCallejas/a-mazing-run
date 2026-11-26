import { BoxGeometry, CylinderGeometry, DoubleSide, PlaneGeometry, SphereGeometry, TorusGeometry } from 'three';
import type { TreasureBuilder } from './kit';

/** Rolled parchment on wooden rods, a red wax seal, and a loose page of faintly glowing ink. */
export const buildLoreScroll: TreasureBuilder = (kit) => {
  const parchment = kit.surface({ color: '#d8c49a', roughness: 0.9, side: DoubleSide });
  const wood = kit.surface({ color: '#3b2717', roughness: 0.8 });
  const ribbon = kit.surface({ color: '#5a1f22', roughness: 0.8 });
  const wax = kit.glow('#c23a2a', 0.5, { color: '#7d1a16', roughness: 0.4 });
  const ink = kit.glow('#ffd88a', 1.4);

  // Roll lies along x, tilted a touch for a livelier silhouette.
  const roll = kit.pivot(kit.body, 'roll');
  roll.rotation.z = 0.12;
  const scroll = kit.add(roll, new CylinderGeometry(0.048, 0.048, 0.26, 14), parchment, 'roll');
  scroll.rotation.z = Math.PI / 2;
  for (const side of [-1, 1]) {
    const rod = kit.add(roll, new CylinderGeometry(0.012, 0.012, 0.05, 6), wood, 'rod');
    rod.rotation.z = Math.PI / 2;
    rod.position.x = side * 0.15;
    kit.add(roll, new SphereGeometry(0.02, 8, 6), wood, 'knob').position.x = side * 0.18;
  }
  const band = kit.add(roll, new TorusGeometry(0.05, 0.007, 4, 16), ribbon, 'ribbon');
  band.rotation.y = Math.PI / 2;
  const seal = kit.add(roll, new CylinderGeometry(0.026, 0.028, 0.012, 12), wax, 'seal');
  seal.rotation.x = Math.PI / 2;
  seal.position.set(0, 0, 0.055);

  // Half-unrolled page hanging from the roll, inked lines glowing.
  const page = kit.pivot(roll, 'page', 0, -0.03, 0.035);
  page.rotation.x = 0.35;
  const sheet = kit.add(page, new PlaneGeometry(0.2, 0.11), parchment, 'sheet');
  sheet.position.y = -0.055;
  const lines: Array<[number, number]> = [
    // width, y
    [0.14, -0.03],
    [0.12, -0.05],
    [0.15, -0.07],
    [0.08, -0.09],
  ];
  for (const [width, y] of lines) {
    kit.add(page, new BoxGeometry(width, 0.006, 0.002), ink, 'inkLine').position.set(-0.075 + width / 2, y, 0.002);
  }

  kit.addMotes('#ffe2a0');

  return {
    accent: '#ffd88a',
    animate: (t) => {
      kit.setLevel(ink, 0.55 + 0.45 * Math.sin(t * 1.6 + Math.sin(t * 0.7)));
      kit.setLevel(wax, 0.8 + 0.2 * Math.sin(t * 2.2));
      kit.float.position.y = 0.26 + Math.sin(t * 1.25) * 0.025;
      kit.body.rotation.y = Math.sin(t * 0.4) * 0.6;
      kit.body.rotation.z = Math.sin(t * 0.8) * 0.05;
      kit.animateMotes(t);
    },
  };
};
