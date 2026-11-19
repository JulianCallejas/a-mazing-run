import {
  BoxGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  ExtrudeGeometry,
  Group,
  LatheGeometry,
  Mesh,
  MeshStandardMaterial,
  Shape,
  SphereGeometry,
  TorusGeometry,
  Vector2,
  type BufferGeometry,
  type Material,
} from 'three';
import { createRandom } from '../../core/random';
import type { CharacterModel } from './hero';
import { mergeStaticParts } from './mergeParts';

export interface GuardianJoints {
  body: Group;
  torso: Group;
  head: Group;
  cape: Group;
  leftLeg: Group;
  rightLeg: Group;
  leftKnee: Group;
  rightKnee: Group;
  leftArm: Group;
  rightArm: Group;
  weapon: Group;
  /** Visor and chest rune share this material; its emissive intensity is the threat cue. */
  glow: MeshStandardMaterial;
}

const createGuardianMaterials = () => ({
  armor: new MeshStandardMaterial({ color: '#40444d', metalness: 0.85, roughness: 0.42 }),
  armorDark: new MeshStandardMaterial({ color: '#25272d', metalness: 0.8, roughness: 0.55 }),
  bronze: new MeshStandardMaterial({ color: '#7a5a2e', metalness: 0.9, roughness: 0.35 }),
  cape: new MeshStandardMaterial({ color: '#1f1217', roughness: 0.95, side: DoubleSide }),
  leather: new MeshStandardMaterial({ color: '#2c1d16', roughness: 0.8 }),
  wood: new MeshStandardMaterial({ color: '#3b2717', roughness: 0.8 }),
  steel: new MeshStandardMaterial({ color: '#9aa0a8', metalness: 1, roughness: 0.28 }),
  glow: new MeshStandardMaterial({
    color: '#120303',
    emissive: new Color('#ff2a1a'),
    emissiveIntensity: 3,
    toneMapped: false,
  }),
});

type Materials = ReturnType<typeof createGuardianMaterials>;

const add = (parent: Group, geometry: BufferGeometry, material: Material, name: string, shadow = true) => {
  const mesh = new Mesh(geometry, material);
  mesh.name = name;
  mesh.castShadow = shadow;
  parent.add(mesh);
  return mesh;
};

const pivot = (parent: Group, name: string, x = 0, y = 0, z = 0) => {
  const group = new Group();
  group.name = name;
  group.position.set(x, y, z);
  parent.add(group);
  return group;
};

const buildLeg = (body: Group, side: -1 | 1, m: Materials) => {
  const hip = pivot(body, side < 0 ? 'leftLeg' : 'rightLeg', side * 0.1, 0.62, 0);
  add(hip, new CylinderGeometry(0.075, 0.065, 0.26, 10), m.armorDark, 'cuisse').position.y = -0.15;
  const knee = pivot(hip, side < 0 ? 'leftKnee' : 'rightKnee', 0, -0.3, 0);
  add(knee, new SphereGeometry(0.06, 10, 8), m.armor, 'kneeCop').position.z = 0.02;
  add(knee, new CylinderGeometry(0.062, 0.055, 0.24, 10), m.armor, 'greave').position.y = -0.14;
  const sabaton = add(knee, new BoxGeometry(0.12, 0.07, 0.22), m.armorDark, 'sabaton');
  sabaton.position.set(0, -0.285, 0.04);
  return { hip, knee };
};

/** Tattered cape: an open half-cylinder whose bottom edge is torn at random. */
const tatteredCape = () => {
  const geometry = new CylinderGeometry(0.2, 0.3, 0.9, 18, 4, true, Math.PI / 2 + 0.2, Math.PI - 0.4);
  const random = createRandom(66);
  const position = geometry.attributes.position;
  for (let i = 0; i < position.count; i++) {
    const y = position.getY(i);
    if (y < -0.44) position.setY(i, y + random() * 0.22);
  }
  geometry.computeVertexNormals();
  return geometry;
};

const halberd = (m: Materials) => {
  const weapon = new Group();
  weapon.name = 'halberd';
  add(weapon, new CylinderGeometry(0.018, 0.02, 1.6, 8), m.wood, 'haft');
  const blade = new Shape();
  blade.moveTo(0, 0.1);
  blade.quadraticCurveTo(0.2, 0.06, 0.22, -0.12);
  blade.quadraticCurveTo(0.1, -0.06, 0, -0.1);
  blade.lineTo(0, 0.1);
  const axe = add(
    weapon,
    new ExtrudeGeometry(blade, { depth: 0.012, bevelEnabled: true, bevelSize: 0.006, bevelThickness: 0.004, bevelSegments: 1 }),
    m.steel,
    'axeHead',
  );
  axe.position.set(0.015, 0.6, -0.006);
  add(weapon, new ConeGeometry(0.025, 0.22, 6), m.steel, 'spike').position.y = 0.9;
  const hook = add(weapon, new ConeGeometry(0.02, 0.12, 5), m.steel, 'backHook');
  hook.position.set(-0.06, 0.62, 0);
  hook.rotation.z = Math.PI / 2;
  add(weapon, new CylinderGeometry(0.026, 0.026, 0.06, 8), m.bronze, 'collar').position.y = 0.5;
  return weapon;
};

/**
 * The cursed guardian: a tall knight in dark plate with bronze trim, horned
 * great helm with a burning T-visor, chest rune, tattered cape and halberd.
 * Silhouette and the red visor make it unmistakable from the hero at any
 * distance. Feet at y = 0, faces +z.
 */
export const buildGuardian = (): CharacterModel<GuardianJoints> => {
  const m = createGuardianMaterials();
  const root = new Group();
  root.name = 'guardian';
  const body = pivot(root, 'body');
  const legs = { left: buildLeg(body, -1, m), right: buildLeg(body, 1, m) };

  const torso = pivot(body, 'torso', 0, 0.62, 0);
  const plate = [
    new Vector2(0.0, -0.02),
    new Vector2(0.16, -0.02),
    new Vector2(0.15, 0.1),
    new Vector2(0.19, 0.3),
    new Vector2(0.2, 0.4),
    new Vector2(0.12, 0.48),
    new Vector2(0.0, 0.48),
  ];
  add(torso, new LatheGeometry(plate, 16), m.armor, 'breastplate');
  add(torso, new CylinderGeometry(0.17, 0.23, 0.18, 14, 1, true), m.armorDark, 'faulds').position.y = -0.08;
  const belt = add(torso, new TorusGeometry(0.16, 0.02, 6, 20), m.leather, 'belt');
  belt.position.y = 0.02;
  belt.rotation.x = Math.PI / 2;
  // Downward-pointing triangular rune (a 3-segment torus) on the breastplate.
  const rune = add(torso, new TorusGeometry(0.05, 0.009, 4, 3), m.glow, 'chestRune', false);
  rune.position.set(0, 0.31, 0.197);
  rune.rotation.z = -Math.PI / 2;

  for (const side of [-1, 1]) {
    const pauldron = add(
      torso,
      new SphereGeometry(0.12, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2),
      m.armor,
      'pauldron',
    );
    pauldron.position.set(side * 0.22, 0.42, 0);
    pauldron.rotation.z = -side * 0.35;
    const rim = add(torso, new TorusGeometry(0.115, 0.012, 6, 18), m.bronze, 'pauldronRim');
    rim.position.set(side * 0.22, 0.42, 0);
    rim.rotation.set(Math.PI / 2, 0, -side * 0.35);
  }

  const cape = pivot(torso, 'cape', 0, 0.44, -0.05);
  add(cape, tatteredCape(), m.cape, 'capeCloth').position.y = -0.45;

  const head = pivot(torso, 'head', 0, 0.48, 0);
  add(head, new CylinderGeometry(0.11, 0.115, 0.22, 16), m.armor, 'helm').position.y = 0.12;
  add(head, new SphereGeometry(0.11, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), m.armor, 'helmDome').position.y = 0.23;
  add(head, new TorusGeometry(0.113, 0.01, 6, 20), m.bronze, 'helmBand').rotation.x = Math.PI / 2;
  head.getObjectByName('helmBand')!.position.y = 0.17;
  // Two burning eye slits split by a dark nasal bar.
  for (const side of [-1, 1]) {
    const slit = add(head, new BoxGeometry(0.06, 0.018, 0.02), m.glow, 'visorSlit', false);
    slit.position.set(side * 0.042, 0.15, 0.108);
  }
  const nasal = add(head, new BoxGeometry(0.022, 0.11, 0.03), m.armorDark, 'nasalBar');
  nasal.position.set(0, 0.12, 0.112);
  for (const side of [-1, 1]) {
    const horn = add(head, new ConeGeometry(0.03, 0.2, 8), m.bronze, 'horn');
    horn.position.set(side * 0.12, 0.27, -0.01);
    horn.rotation.set(-0.3, 0, -side * 0.75);
  }

  const arm = (side: -1 | 1) => {
    const shoulder = pivot(torso, side < 0 ? 'leftArm' : 'rightArm', side * 0.24, 0.38, 0);
    shoulder.rotation.z = side * 0.18;
    add(shoulder, new CylinderGeometry(0.055, 0.05, 0.22, 10), m.armorDark, 'rerebrace').position.y = -0.13;
    add(shoulder, new SphereGeometry(0.055, 10, 8), m.armor, 'couter').position.y = -0.26;
    add(shoulder, new CylinderGeometry(0.05, 0.06, 0.2, 10), m.armor, 'vambrace').position.y = -0.37;
    add(shoulder, new BoxGeometry(0.08, 0.09, 0.08), m.armorDark, 'gauntlet').position.y = -0.5;
    return shoulder;
  };
  const leftArm = arm(-1);
  const rightArm = arm(1);

  const weapon = pivot(rightArm, 'weapon', 0, -0.5, 0.04);
  weapon.add(halberd(m));
  weapon.rotation.set(0.25, 0, -0.18);

  mergeStaticParts(root);

  return {
    root,
    joints: {
      body,
      torso,
      head,
      cape,
      leftLeg: legs.left.hip,
      rightLeg: legs.right.hip,
      leftKnee: legs.left.knee,
      rightKnee: legs.right.knee,
      leftArm,
      rightArm,
      weapon,
      glow: m.glow,
    },
    dispose: () => {
      root.traverse((object) => {
        if (object instanceof Mesh) object.geometry.dispose();
      });
      Object.values(m).forEach((material) => material.dispose());
    },
  };
};
