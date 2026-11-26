import { CylinderGeometry, DoubleSide, LatheGeometry, SphereGeometry, TorusGeometry, Vector2 } from 'three';
import type { TreasureBuilder } from './kit';

/** Round-bellied flask profile (radius, height), base at y = 0. */
const FLASK_PROFILE = [
  new Vector2(0.0, 0),
  new Vector2(0.055, 0.004),
  new Vector2(0.085, 0.04),
  new Vector2(0.088, 0.08),
  new Vector2(0.07, 0.125),
  new Vector2(0.03, 0.15),
  new Vector2(0.026, 0.2),
  new Vector2(0.032, 0.21),
];

const DRIP_PERIOD = 2.4;

/** Little glass flask of glowing amber lantern oil, corked, shedding a slow drip of light. */
export const buildOilFlask: TreasureBuilder = (kit) => {
  const glass = kit.surface({
    color: '#ffe4b8',
    roughness: 0.08,
    metalness: 0.1,
    opacity: 0.35,
    side: DoubleSide,
    depthWrite: false,
  });
  const oil = kit.glow('#ffa630', 2.4);
  const cork = kit.surface({ color: '#8a6440', roughness: 0.9 });
  const twine = kit.surface({ color: '#4a3424', roughness: 0.9 });
  const drip = kit.light('#ffc46b', 0.95);

  const flask = kit.pivot(kit.body, 'flask', 0, -0.11, 0);
  kit.add(flask, new LatheGeometry(FLASK_PROFILE, 14), glass, 'glass');
  // Oil fills the belly: a squashed sphere inside the glass.
  const fill = kit.add(flask, new SphereGeometry(0.074, 14, 10), oil, 'oil');
  fill.position.y = 0.065;
  fill.scale.y = 0.85;
  kit.add(flask, new CylinderGeometry(0.03, 0.024, 0.04, 10), cork, 'cork').position.y = 0.225;
  const tie = kit.add(flask, new TorusGeometry(0.029, 0.005, 4, 12), twine, 'twine');
  tie.rotation.x = Math.PI / 2;
  tie.position.y = 0.195;

  // A bead of light that falls from the flask base and fades.
  const bead = kit.add(kit.float, new SphereGeometry(0.012, 8, 6), drip, 'drip');
  bead.scale.y = 1.6;

  return {
    accent: '#ffa630',
    keep: [fill, bead],
    animate: (t) => {
      const flicker = 0.85 + 0.15 * Math.sin(t * 11.3) * Math.sin(t * 6.7);
      kit.setLevel(oil, flicker);
      fill.scale.set(1, 0.85 + Math.sin(t * 2) * 0.03, 1);
      kit.float.position.y = 0.27 + Math.sin(t * 1.4) * 0.025;
      kit.body.rotation.set(Math.sin(t * 1.1) * 0.08, t * 0.3, Math.sin(t * 0.9) * 0.08);

      const phase = (t % DRIP_PERIOD) / DRIP_PERIOD;
      bead.position.y = -0.12 - phase * phase * 0.12;
      kit.setLevel(drip, phase < 0.85 ? 1 - phase : 0);
    },
  };
};
