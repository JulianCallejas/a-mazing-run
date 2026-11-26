import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, Group, MathUtils, Mesh, MeshBasicMaterial, PlaneGeometry } from 'three';
import type { GameEngine } from '../core/engine';
import { buildTreasureModel, type TreasureModel } from '../art/treasures';
import { getTextures } from '../art/proceduralTextures';

/** Within this distance (cells) a treasure glints at full strength. */
const REVEAL_NEAR = 2.2;
/** Beyond this distance (cells) a treasure is fully hidden and not rendered. */
const REVEAL_FAR = 4;
/** Seconds of the pickup animation (rise, spin, shrink, flash). */
const PICKUP_SECONDS = 0.4;
const HALO_SIZE = 0.9;
const HALO_OPACITY = 0.3;

interface TreasureView {
  id: string;
  holder: Group;
  model: TreasureModel;
  halo: MeshBasicMaterial;
  haloMesh: Mesh;
  /** Clock time the pickup started; null while not collected. */
  pickedAt: number | null;
  /** Pickup finished (or collected before mount): stays hidden. */
  done: boolean;
}

interface TreasuresProps {
  engine: GameEngine;
}

/**
 * Hidden treasures: each one only reveals itself (a faint glint and a soft
 * ground halo) when the hero carries the lantern within a few cells, so far
 * treasures cost nothing to render. Collected treasures rise, spin, flash and
 * vanish. Visibility depends only on the hero's distance, never on the
 * camera, so the aerial view shows them too.
 */
export const Treasures = ({ engine }: TreasuresProps) => {
  const scene = useMemo(() => {
    const glow = getTextures().glow;
    const haloGeometry = new PlaneGeometry(HALO_SIZE, HALO_SIZE);
    const container = new Group();
    container.name = 'treasures';

    const views: TreasureView[] = engine.treasures.map((treasure) => {
      const holder = new Group();
      holder.name = treasure.id;
      holder.position.set(treasure.cell.x, 0, treasure.cell.z);
      holder.visible = false;

      const model = buildTreasureModel(treasure.kind);
      holder.add(model.root);

      const halo = new MeshBasicMaterial({
        map: glow,
        color: model.accent,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: AdditiveBlending,
        toneMapped: false,
      });
      const haloMesh = new Mesh(haloGeometry, halo);
      haloMesh.rotation.x = -Math.PI / 2;
      haloMesh.position.y = 0.025;
      haloMesh.renderOrder = 1;
      holder.add(haloMesh);

      container.add(holder);
      return { id: treasure.id, holder, model, halo, haloMesh, pickedAt: null, done: treasure.collected };
    });

    const dispose = () => {
      for (const view of views) {
        view.model.dispose();
        view.halo.dispose();
      }
      haloGeometry.dispose();
    };
    return { container, views, dispose };
  }, [engine]);

  const live = useRef<typeof scene | null>(null);
  useLayoutEffect(() => {
    live.current = scene;
  }, [scene]);
  useEffect(() => () => scene.dispose(), [scene]);

  useFrame(({ clock }) => {
    const current = live.current;
    if (!current) return;
    const t = clock.elapsedTime;
    const player = engine.player.position;

    current.views.forEach((view, index) => {
      const treasure = engine.treasures[index];
      if (!treasure || view.done) {
        view.holder.visible = false;
        return;
      }

      if (treasure.collected) {
        view.pickedAt ??= t;
        const p = (t - view.pickedAt) / PICKUP_SECONDS;
        if (p >= 1) {
          view.done = true;
          view.holder.visible = false;
          return;
        }
        const root = view.model.root;
        view.holder.visible = true;
        root.position.y = p * 0.45;
        root.rotation.y = p * Math.PI * 3;
        root.scale.setScalar(Math.max(0.001, (1 + Math.sin(p * Math.PI) * 0.3) * (1 - p * p)));
        const flare = 1 - p;
        view.model.animate(t, 1, flare);
        view.halo.opacity = HALO_OPACITY + flare * 0.9;
        view.haloMesh.scale.setScalar(1 + p * 1.8);
        return;
      }

      const distance = Math.hypot(player.x - treasure.cell.x, player.z - treasure.cell.z);
      const glint = 1 - MathUtils.smoothstep(distance, REVEAL_NEAR, REVEAL_FAR);
      if (glint <= 0.001) {
        view.holder.visible = false;
        return;
      }
      view.holder.visible = true;
      view.model.animate(t, glint);
      // Halo breathes a little so a distant glint catches the eye.
      view.halo.opacity = HALO_OPACITY * glint * (0.8 + 0.2 * Math.sin(t * 2 + index));
    });
  });

  return <primitive object={scene.container} />;
};

export default Treasures;
