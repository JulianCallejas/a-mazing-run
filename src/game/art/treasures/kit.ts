import {
  AdditiveBlending,
  Color,
  Group,
  IcosahedronGeometry,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  type BufferGeometry,
  type ColorRepresentation,
  type Material,
  type MeshStandardMaterialParameters,
  type Object3D,
} from 'three';
import type { Rarity } from '../../core/treasures';
import { mergeStaticParts } from '../characters/mergeParts';
import { QUALITY } from '../quality';

/** Height of the floating centre of a treasure above the floor. */
export const FLOAT_HEIGHT = 0.3;

/** Emissive gain per rarity: common glows faintly, rare glows richly. */
const RARITY_GAIN: Readonly<Record<Rarity, number>> = { common: 0.75, uncommon: 1.15, rare: 1.6 };

/** Orbiting motes around rare treasures, fewer on the mobile tier. */
const MOTE_COUNT = QUALITY.name === 'mobile' ? 2 : 4;

interface Tracked {
  material: MeshStandardMaterial | MeshBasicMaterial;
  opacity: number;
  emissive: number;
  /** Per-frame animation multiplier (pulse, flicker, shimmer). */
  level: number;
}

/**
 * Shared scaffolding for every treasure: the pivot hierarchy, tracked
 * materials (so a single `applyGlint` fades the whole object in and out) and
 * the rare-tier orbiting motes. Nothing here touches the DOM, so models build
 * under node tests.
 */
export const createKit = (rarity: Rarity) => {
  const tracked: Tracked[] = [];
  const gain = RARITY_GAIN[rarity];

  /** Floor-level origin of the treasure (placed on the cell centre). */
  const root = new Group();
  /** Idle bob / drift pivot, at the floating height. */
  const float = new Group();
  float.name = 'float';
  float.position.y = FLOAT_HEIGHT;
  root.add(float);
  /** Spinning content pivot. */
  const body = new Group();
  body.name = 'body';
  float.add(body);

  const track = <M extends MeshStandardMaterial | MeshBasicMaterial>(material: M, emissive = 0): M => {
    material.transparent = true;
    tracked.push({ material, opacity: material.opacity, emissive, level: 1 });
    return material;
  };

  /** Lit surface (stone, metal, glass, parchment). */
  const surface = (params: MeshStandardMaterialParameters) => track(new MeshStandardMaterial(params));

  /** Self-lit accent; its intensity follows glint, rarity and the per-frame level. */
  const glow = (color: ColorRepresentation, intensity: number, params: MeshStandardMaterialParameters = {}) =>
    track(
      new MeshStandardMaterial({
        color: '#050505',
        emissive: new Color(color),
        emissiveIntensity: intensity,
        toneMapped: false,
        ...params,
      }),
      intensity,
    );

  /** Unlit additive light (halos, motes, ripples). */
  const light = (color: ColorRepresentation, opacity: number) =>
    track(
      new MeshBasicMaterial({
        color,
        opacity,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        toneMapped: false,
      }),
    );

  const add = (parent: Group, geometry: BufferGeometry, material: Material, name: string) => {
    const mesh = new Mesh(geometry, material);
    mesh.name = name;
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

  /** Sets the animation multiplier of a tracked material. */
  const setLevel = (material: Material, level: number) => {
    const entry = tracked.find((t) => t.material === material);
    if (entry) entry.level = level;
  };

  /** Rare treasures get a few slow motes orbiting the float pivot. */
  const motes: Mesh[] = [];
  const addMotes = (color: ColorRepresentation, radius = 0.22) => {
    if (rarity !== 'rare') return;
    const material = light(color, 0.9);
    const geometry = new IcosahedronGeometry(0.014, 0);
    for (let i = 0; i < MOTE_COUNT; i++) {
      const mote = add(float, i === 0 ? geometry : geometry.clone(), material, 'mote');
      mote.userData.radius = radius * (0.85 + 0.3 * ((i * 37) % 10) / 10);
      mote.userData.phase = (i / MOTE_COUNT) * Math.PI * 2;
      motes.push(mote);
    }
  };

  const animateMotes = (t: number) => {
    for (const mote of motes) {
      const r = mote.userData.radius as number;
      const a = t * 0.9 + (mote.userData.phase as number);
      mote.position.set(Math.cos(a) * r, Math.sin(a * 1.7) * 0.07, Math.sin(a) * r);
    }
  };

  /**
   * Fades every tracked material: opacity follows `glint`, emissive follows
   * glint × rarity × level, and `flare` (0..1) briefly overdrives the light.
   */
  const applyGlint = (glint: number, flare: number) => {
    const g = Math.max(0, Math.min(1, glint));
    root.visible = g > 0.001 || flare > 0.001;
    const boost = 1 + flare * 3;
    for (const t of tracked) {
      if (t.material instanceof MeshStandardMaterial) {
        t.material.opacity = Math.min(1, t.opacity * Math.max(g, flare));
        t.material.emissiveIntensity = t.emissive * gain * t.level * g * boost;
      } else {
        t.material.opacity = Math.min(1, t.opacity * t.level * Math.max(g, flare) * boost);
      }
    }
  };

  /** Bakes static parts into fewer draw calls; `keep` lists meshes animated individually. */
  const finish = (keep: readonly Object3D[] = []) => {
    mergeStaticParts(root, new Set<Object3D>([...keep, ...motes]));
  };

  const dispose = () => {
    root.traverse((object) => {
      if (object instanceof Mesh) object.geometry.dispose();
    });
    for (const t of tracked) t.material.dispose();
  };

  return {
    root,
    float,
    body,
    surface,
    glow,
    light,
    add,
    pivot,
    setLevel,
    addMotes,
    animateMotes,
    applyGlint,
    finish,
    dispose,
  };
};

export type TreasureKit = ReturnType<typeof createKit>;

/** What each per-kind builder returns to `buildTreasureModel`. */
export interface TreasureParts {
  /** Idle animation (bob, spin, pulse...); `t` is clock time in seconds. */
  animate: (t: number) => void;
  /** Meshes moved or scaled per frame, kept out of the static merge. */
  keep?: Object3D[];
  /** Signature light colour (ground halo, pickup flash). */
  accent: string;
}

export type TreasureBuilder = (kit: TreasureKit) => TreasureParts;
