import { BoxGeometry, ConeGeometry, CylinderGeometry, OctahedronGeometry, TorusGeometry } from 'three';
import type { TreasureBuilder } from './kit';

/** Same gold as the exit gate trim and portal light (scene/world/ExitGate.tsx). */
const GATE_GOLD = '#c99a3a';
const GATE_GLOW = '#ffc46b';

/** Broken half of the golden key that opens the portal: ornate bow, snapped shaft, warm glow. */
export const buildKeyFragment: TreasureBuilder = (kit) => {
  const gold = kit.surface({
    color: GATE_GOLD,
    metalness: 0.95,
    roughness: 0.3,
    emissive: '#5a3a08',
    emissiveIntensity: 0.6,
  });
  const gem = kit.glow(GATE_GLOW, 2.8);

  // Key lies diagonally so both the bow and the break read at a glance.
  const key = kit.pivot(kit.body, 'key');
  key.rotation.z = -0.75;

  const bow = kit.add(key, new TorusGeometry(0.06, 0.016, 8, 20), gold, 'bow');
  bow.position.y = 0.07;
  // Trefoil lobes on the bow.
  for (const angle of [0, (Math.PI * 2) / 3, (Math.PI * 4) / 3]) {
    const lobe = kit.add(key, new TorusGeometry(0.022, 0.008, 6, 12), gold, 'lobe');
    lobe.position.set(Math.sin(angle) * 0.075, 0.07 + Math.cos(angle) * 0.075, 0);
  }
  const heart = kit.add(key, new OctahedronGeometry(0.026, 0), gem, 'gem');
  heart.position.y = 0.07;
  kit.add(key, new CylinderGeometry(0.024, 0.024, 0.024, 10), gold, 'collar').position.y = 0.0;

  const shaft = kit.add(key, new CylinderGeometry(0.014, 0.014, 0.12, 8), gold, 'shaft');
  shaft.position.y = -0.07;
  // Jagged break: a crooked stub and a glowing fracture.
  const stub = kit.add(key, new ConeGeometry(0.014, 0.03, 5), gold, 'break');
  stub.position.set(0.003, -0.143, 0);
  stub.rotation.set(Math.PI, 0, 0.35);
  kit.add(key, new BoxGeometry(0.026, 0.004, 0.026), gem, 'fracture').position.y = -0.13;

  kit.addMotes(GATE_GLOW);

  return {
    accent: GATE_GLOW,
    keep: [heart],
    animate: (t) => {
      const shine = 0.6 + 0.4 * Math.sin(t * 2.1);
      kit.setLevel(gem, shine);
      heart.rotation.y = t * 2;
      kit.float.position.y = 0.28 + Math.sin(t * 1.35) * 0.022;
      kit.body.rotation.y = t * 0.6;
      kit.animateMotes(t);
    },
  };
};
