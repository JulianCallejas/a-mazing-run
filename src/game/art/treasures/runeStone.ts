import { BoxGeometry, DodecahedronGeometry, ExtrudeGeometry, Shape } from 'three';
import type { TreasureBuilder } from './kit';

/** Tablet outline: straight sides, arched top (local units, base at y = 0). */
const tabletShape = () => {
  const shape = new Shape();
  shape.moveTo(-0.09, 0);
  shape.lineTo(0.09, 0);
  shape.lineTo(0.085, 0.2);
  shape.absarc(0, 0.2, 0.085, 0, Math.PI, false);
  shape.lineTo(-0.09, 0);
  return shape;
};

/** Small standing stone tablet resting on the floor, a carved rune glowing teal. */
export const buildRuneStone: TreasureBuilder = (kit) => {
  const stone = kit.surface({ color: '#5f5b55', roughness: 0.95, flatShading: true });
  const rune = kit.glow('#5ff0d0', 1.8);

  // Rests on the floor instead of floating: an ancient marker, slightly leaning.
  kit.float.position.y = 0.03;
  kit.body.rotation.set(-0.08, 0.3, 0.05);

  const tablet = new ExtrudeGeometry(tabletShape(), {
    depth: 0.06,
    bevelEnabled: true,
    bevelThickness: 0.008,
    bevelSize: 0.008,
    bevelSegments: 1,
    curveSegments: 8,
  });
  tablet.translate(0, 0, -0.03);
  kit.add(kit.body, tablet, stone, 'tablet');
  const pebble = kit.add(kit.body, new DodecahedronGeometry(0.035, 0), stone, 'pebble');
  pebble.position.set(0.1, 0.015, 0.05);

  // Carved rune on both faces: a stave with a crossing chevron.
  for (const side of [-1, 1]) {
    const z = side * 0.039;
    const strokes: Array<[number, number, number, number]> = [
      // height, x, y, angle
      [0.17, 0, 0.15, 0],
      [0.08, 0.025, 0.2, -0.7],
      [0.08, -0.025, 0.2, 0.7],
      [0.06, 0.02, 0.09, 0.7],
    ];
    for (const [height, x, y, angle] of strokes) {
      const stroke = kit.add(kit.body, new BoxGeometry(0.014, height, 0.004), rune, 'runeStroke');
      stroke.position.set(x * side, y, z);
      stroke.rotation.z = angle * side;
    }
  }

  return {
    accent: '#5ff0d0',
    animate: (t) => {
      // Slow breathing glow with a faint stutter, like an old enchantment.
      const breathe = 0.5 + 0.5 * Math.sin(t * 1.1);
      const stutter = Math.sin(t * 9.7) > 0.96 ? 0.6 : 1;
      kit.setLevel(rune, (0.45 + breathe * 0.75) * stutter);
    },
  };
};
