import { DodecahedronGeometry, OctahedronGeometry } from 'three';
import type { TreasureBuilder } from './kit';

/** Silver-blue crystal cluster on a stone nub, breathing cold moonlight. */
export const buildMoonShard: TreasureBuilder = (kit) => {
  const crystal = kit.surface({
    color: '#b9c9ea',
    metalness: 0.35,
    roughness: 0.15,
    emissive: '#3d5fa8',
    emissiveIntensity: 0.4,
    opacity: 0.92,
  });
  const core = kit.glow('#8fb6ff', 2.2);
  const stone = kit.surface({ color: '#3f3d3b', roughness: 0.95, flatShading: true });

  kit.add(kit.body, new DodecahedronGeometry(0.07, 0), stone, 'nub').position.y = -0.1;

  // Tall central shard with two leaning siblings.
  const shards: Array<[number, number, number, number, number]> = [
    // height, x, z, tiltX, tiltZ
    [0.26, 0, 0, 0, 0],
    [0.17, 0.05, 0.02, 0.15, -0.5],
    [0.14, -0.045, -0.02, -0.2, 0.55],
  ];
  for (const [height, x, z, tiltX, tiltZ] of shards) {
    const shard = kit.add(kit.body, new OctahedronGeometry(0.05, 0), crystal, 'shard');
    shard.scale.set(0.75, height / 0.1, 0.75);
    shard.position.set(x, -0.06 + height * 0.4, z);
    shard.rotation.set(tiltX, x * 8, tiltZ);
  }
  // Inner cold light, visible through the translucent crystal.
  const heart = kit.add(kit.body, new OctahedronGeometry(0.022, 0), core, 'heart');
  heart.position.y = 0.02;
  heart.scale.y = 2.2;

  return {
    accent: '#8fb6ff',
    keep: [heart],
    animate: (t) => {
      const pulse = 0.55 + 0.45 * Math.sin(t * 1.8);
      kit.setLevel(core, 0.6 + pulse * 0.8);
      heart.scale.set(0.9 + pulse * 0.25, 2.2, 0.9 + pulse * 0.25);
      kit.float.position.y = 0.26 + Math.sin(t * 1.3) * 0.02;
      kit.body.rotation.y = t * 0.25;
    },
  };
};
