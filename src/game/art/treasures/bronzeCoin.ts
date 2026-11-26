import { BoxGeometry, CylinderGeometry, TorusGeometry } from 'three';
import type { TreasureBuilder } from './kit';

/** Worn bronze coin standing on its edge, an engraved rune ring glowing amber; slow spin. */
export const buildBronzeCoin: TreasureBuilder = (kit) => {
  const bronze = kit.surface({ color: '#8a6a35', metalness: 0.9, roughness: 0.45 });
  const rim = kit.surface({ color: '#5e4422', metalness: 0.85, roughness: 0.55 });
  const rune = kit.glow('#ffb347', 1.6);

  const coin = kit.pivot(kit.body, 'coin');
  coin.rotation.x = Math.PI / 2; // face toward ±z, edge on the floor axis
  kit.add(coin, new CylinderGeometry(0.13, 0.13, 0.024, 24), bronze, 'face');
  const edge = kit.add(coin, new TorusGeometry(0.128, 0.012, 6, 24), rim, 'rim');
  edge.rotation.x = Math.PI / 2;

  // Engraved ring and a three-stroke rune on both faces.
  for (const side of [-1, 1]) {
    const ring = kit.add(coin, new TorusGeometry(0.085, 0.006, 4, 24), rune, 'runeRing');
    ring.rotation.x = Math.PI / 2;
    ring.position.y = side * 0.013;
    const strokes: Array<[number, number, number, number]> = [
      // length, x, z, angle
      [0.1, 0, 0, 0],
      [0.055, 0.02, -0.018, 0.8],
      [0.055, -0.02, 0.018, 0.8],
    ];
    for (const [length, x, z, angle] of strokes) {
      const stroke = kit.add(coin, new BoxGeometry(0.012, 0.004, length), rune, 'runeStroke');
      stroke.position.set(x, side * 0.013, z);
      stroke.rotation.y = angle;
    }
  }

  return {
    accent: '#ffb347',
    animate: (t) => {
      kit.setLevel(rune, 0.7 + 0.3 * Math.sin(t * 2.4));
      kit.float.position.y = 0.24 + Math.sin(t * 1.5) * 0.02;
      kit.body.rotation.y = t * 0.9;
    },
  };
};
