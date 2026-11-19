import {
  BoxGeometry,
  CapsuleGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  Group,
  LatheGeometry,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  PointLight,
  SphereGeometry,
  TorusGeometry,
  Vector2,
  type BufferGeometry,
  type Material,
} from 'three';
import { mergeStaticParts } from './mergeParts';

/** Named pivots the animation layer drives. All rotate about local X unless noted. */
export interface HeroJoints {
  body: Group;
  torso: Group;
  head: Group;
  cloak: Group;
  leftLeg: Group;
  rightLeg: Group;
  leftKnee: Group;
  rightKnee: Group;
  leftArm: Group;
  rightArm: Group;
  leftElbow: Group;
  rightElbow: Group;
  lantern: Group;
  lanternLight: PointLight;
  lanternCore: Mesh;
}

export interface CharacterModel<J> {
  root: Group;
  joints: J;
  dispose: () => void;
}

/** Hero palette: crimson cloak (#B64362 family), leather (#533324), gold trim (#D4AF37). */
const createHeroMaterials = () => ({
  cloak: new MeshPhysicalMaterial({
    color: '#7e2433',
    roughness: 0.85,
    sheen: 1,
    sheenRoughness: 0.5,
    sheenColor: new Color('#d0687c'),
    side: DoubleSide,
  }),
  leather: new MeshStandardMaterial({ color: '#5a3826', roughness: 0.7 }),
  cloth: new MeshStandardMaterial({ color: '#2d2a33', roughness: 0.95 }),
  boots: new MeshStandardMaterial({ color: '#23180f', roughness: 0.6 }),
  skin: new MeshStandardMaterial({ color: '#b98468', roughness: 0.65 }),
  iron: new MeshStandardMaterial({ color: '#3d3c40', metalness: 0.85, roughness: 0.4 }),
  gold: new MeshStandardMaterial({ color: '#d4af37', metalness: 1, roughness: 0.3 }),
  glass: new MeshStandardMaterial({
    color: '#ffcf8a',
    emissive: '#ffb052',
    emissiveIntensity: 1.6,
    transparent: true,
    opacity: 0.55,
    roughness: 0.2,
  }),
  flame: new MeshStandardMaterial({ color: '#000000', emissive: '#ffd08a', emissiveIntensity: 6, toneMapped: false }),
  eye: new MeshStandardMaterial({ color: '#0d0b0a', roughness: 0.3 }),
});

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

const buildLeg = (body: Group, side: -1 | 1, m: ReturnType<typeof createHeroMaterials>) => {
  const hip = pivot(body, side < 0 ? 'leftLeg' : 'rightLeg', side * 0.075, 0.5, 0);
  add(hip, new CapsuleGeometry(0.055, 0.17, 4, 10), m.cloth, 'thigh').position.y = -0.12;
  const knee = pivot(hip, side < 0 ? 'leftKnee' : 'rightKnee', 0, -0.24, 0);
  add(knee, new CapsuleGeometry(0.048, 0.15, 4, 10), m.boots, 'shin').position.y = -0.1;
  const boot = add(knee, new BoxGeometry(0.1, 0.07, 0.17), m.boots, 'boot');
  boot.position.set(0, -0.225, 0.03);
  const cuff = add(knee, new CylinderGeometry(0.062, 0.058, 0.05, 10), m.leather, 'bootCuff');
  cuff.position.y = -0.04;
  return { hip, knee };
};

const buildArm = (torso: Group, side: -1 | 1, m: ReturnType<typeof createHeroMaterials>) => {
  const shoulder = pivot(torso, side < 0 ? 'leftArm' : 'rightArm', side * 0.155, 0.33, 0);
  shoulder.rotation.z = side * 0.12;
  add(shoulder, new CapsuleGeometry(0.042, 0.12, 4, 10), m.cloth, 'upperArm').position.y = -0.09;
  const elbow = pivot(shoulder, side < 0 ? 'leftElbow' : 'rightElbow', 0, -0.19, 0);
  add(elbow, new CapsuleGeometry(0.038, 0.11, 4, 10), m.leather, 'forearm').position.y = -0.08;
  add(elbow, new SphereGeometry(0.038, 10, 8), m.skin, 'hand').position.y = -0.17;
  return { shoulder, elbow };
};

/**
 * The hooded wanderer: crimson cloak and hood, leather tunic with gilded
 * buckle, sheathed sword, and a lit lantern in the left hand (real light,
 * keeps the hero readable in dark corridors). Feet at y = 0, faces +z.
 */
export const buildHero = (): CharacterModel<HeroJoints> => {
  const m = createHeroMaterials();
  const root = new Group();
  root.name = 'hero';
  const body = pivot(root, 'body');

  const legs = { left: buildLeg(body, -1, m), right: buildLeg(body, 1, m) };

  const torso = pivot(body, 'torso', 0, 0.5, 0);
  const tunicProfile = [
    new Vector2(0.0, -0.06),
    new Vector2(0.16, -0.06),
    new Vector2(0.14, 0.06),
    new Vector2(0.11, 0.13),
    new Vector2(0.135, 0.27),
    new Vector2(0.12, 0.35),
    new Vector2(0.05, 0.4),
    new Vector2(0.0, 0.4),
  ];
  add(torso, new LatheGeometry(tunicProfile, 14), m.leather, 'tunic');
  add(torso, new TorusGeometry(0.118, 0.018, 6, 18), m.boots, 'belt').rotation.x = Math.PI / 2;
  torso.getObjectByName('belt')!.position.y = 0.12;
  const buckle = add(torso, new BoxGeometry(0.05, 0.04, 0.02), m.gold, 'buckle');
  buckle.position.set(0, 0.12, 0.125);
  const pouch = add(torso, new BoxGeometry(0.06, 0.07, 0.04), m.leather, 'pouch');
  pouch.position.set(-0.09, 0.08, 0.09);

  // Sheathed sword on the right hip.
  const sword = pivot(torso, 'sword', 0.14, 0.05, -0.02);
  sword.rotation.set(0.35, 0, 0.12);
  add(sword, new BoxGeometry(0.035, 0.34, 0.05), m.leather, 'scabbard').position.y = -0.14;
  add(sword, new BoxGeometry(0.12, 0.02, 0.03), m.gold, 'crossguard').position.y = 0.04;
  add(sword, new CylinderGeometry(0.014, 0.014, 0.08, 6), m.boots, 'grip').position.y = 0.09;
  add(sword, new SphereGeometry(0.02, 8, 6), m.gold, 'pommel').position.y = 0.14;

  // Mantle over the shoulders gives the silhouette its cloaked shape.
  const mantle = add(torso, new ConeGeometry(0.2, 0.14, 14, 1, true), m.cloak, 'mantle');
  mantle.position.y = 0.33;

  // Cloak hangs from the shoulder line; its pivot sways back while walking.
  const cloak = pivot(torso, 'cloak', 0, 0.36, -0.02);
  const cape = add(
    cloak,
    new CylinderGeometry(0.15, 0.24, 0.66, 14, 3, true, Math.PI / 2 + 0.3, Math.PI - 0.6),
    m.cloak,
    'cape',
  );
  cape.position.y = -0.33;

  const head = pivot(torso, 'head', 0, 0.4, 0);
  add(head, new CylinderGeometry(0.035, 0.04, 0.05, 8), m.skin, 'neck').position.y = 0.02;
  add(head, new SphereGeometry(0.085, 16, 12), m.skin, 'face').position.y = 0.1;
  for (const side of [-1, 1]) {
    const eye = add(head, new SphereGeometry(0.012, 8, 6), m.eye, 'eye', false);
    eye.position.set(side * 0.03, 0.11, 0.078);
  }
  // Hood: open at the face, pointed tip falling back.
  const hood = add(
    head,
    new SphereGeometry(0.112, 18, 14, Math.PI / 2 + 0.62, Math.PI * 2 - 1.24, 0, Math.PI * 0.8),
    m.cloak,
    'hood',
  );
  hood.position.y = 0.1;
  hood.scale.set(1, 1.08, 1.05);
  const tip = add(head, new ConeGeometry(0.06, 0.16, 10), m.cloak, 'hoodTip');
  tip.position.set(0, 0.17, -0.07);
  tip.rotation.x = -1.1;

  const arms = { left: buildArm(torso, -1, m), right: buildArm(torso, 1, m) };

  // Lantern held forward in the left hand.
  const lantern = pivot(arms.left.elbow, 'lantern', 0, -0.2, 0.02);
  add(lantern, new TorusGeometry(0.025, 0.006, 6, 12), m.iron, 'bail').position.y = 0.01;
  const cage = pivot(lantern, 'cage', 0, -0.07, 0);
  add(cage, new CylinderGeometry(0.035, 0.045, 0.02, 8), m.iron, 'cap').position.y = 0.055;
  add(cage, new CylinderGeometry(0.048, 0.048, 0.02, 8), m.iron, 'base').position.y = -0.055;
  add(cage, new CylinderGeometry(0.036, 0.036, 0.09, 8), m.glass, 'glass', false);
  const lanternCore = add(cage, new SphereGeometry(0.016, 8, 6), m.flame, 'flame', false);
  for (let i = 0; i < 4; i++) {
    const bar = add(cage, new BoxGeometry(0.006, 0.1, 0.006), m.iron, 'bar', false);
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    bar.position.set(Math.cos(a) * 0.042, 0, Math.sin(a) * 0.042);
  }
  const lanternLight = new PointLight('#ffbe73', 2.2, 4.5, 1.6);
  lanternLight.name = 'lanternLight';
  cage.add(lanternLight);

  // Fewer draw calls; the flame core is scaled per frame so it stays separate.
  mergeStaticParts(root, new Set([lanternCore]));

  return {
    root,
    joints: {
      body,
      torso,
      head,
      cloak,
      leftLeg: legs.left.hip,
      rightLeg: legs.right.hip,
      leftKnee: legs.left.knee,
      rightKnee: legs.right.knee,
      leftArm: arms.left.shoulder,
      rightArm: arms.right.shoulder,
      leftElbow: arms.left.elbow,
      rightElbow: arms.right.elbow,
      lantern,
      lanternLight,
      lanternCore,
    },
    dispose: () => {
      root.traverse((object) => {
        if (object instanceof Mesh) object.geometry.dispose();
      });
      Object.values(m).forEach((material) => material.dispose());
    },
  };
};
