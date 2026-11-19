import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { MathUtils, PerspectiveCamera, Vector3 } from 'three';
import type { GameEngine } from '../core/engine';
import type { CameraMode } from '../core/controls';
import { forwardFromYaw, occludedDistance } from '../core/cameraMath';

/** Mutable camera intent shared with the input layer (no React state). */
export interface CameraRigState {
  /** Quarter turns from north; unbounded so turns always animate the short way. */
  yawIndex: number;
  /** Desired third-person distance behind the player. */
  zoom: number;
}

export const MIN_ZOOM = 2;
export const MAX_ZOOM = 7;

interface CameraRigProps {
  engine: GameEngine;
  mode: CameraMode;
  rig: CameraRigState;
}

const THIRD_PERSON_FOV = 68;
const AERIAL_FOV = 50;
/** Wall height in world units (walls are 1 × 2 × 1). */
const WALL_TOP = 2;
/** Height the sight line must reach on the character (torso), so most of the body stays visible. */
const SIGHT_TARGET_Y = 0.7;
const SIGHT_MARGIN = 0.35;
const CHASE_BASE_HEIGHT = 2.3;
const CHASE_HEIGHT_PER_ZOOM = 0.45;
const MAX_CHASE_HEIGHT = 7;

/**
 * Single owner of the camera. Third-person: damped follow behind the player,
 * animated 90° turns, and climbs over walls that would block the view.
 * Aerial: north-up overview. Switching modes blends both rigs smoothly.
 */
const CameraRig = ({ engine, mode, rig }: CameraRigProps) => {
  const canvas = useThree((s) => s.gl.domElement);

  const smooth = useRef({
    yaw: rig.yawIndex * (Math.PI / 2),
    blend: mode === 'aerial' ? 1 : 0,
    zoom: rig.zoom,
    edge: rig.zoom,
    horizontal: rig.zoom,
    height: CHASE_BASE_HEIGHT + rig.zoom * CHASE_HEIGHT_PER_ZOOM,
    initialized: false,
  });
  const vectors = useRef({
    third: new Vector3(),
    thirdLook: new Vector3(),
    aerial: new Vector3(),
    aerialLook: new Vector3(),
    target: new Vector3(),
    look: new Vector3(),
    smoothedLook: new Vector3(),
  });

  useEffect(() => {
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      rig.zoom = MathUtils.clamp(rig.zoom + Math.sign(event.deltaY) * 0.5, MIN_ZOOM, MAX_ZOOM);
    };
    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheel);
  }, [canvas, rig]);

  useFrame((state, rawDelta) => {
    const camera = state.camera as PerspectiveCamera;
    const dt = Math.min(rawDelta, 0.1);
    const s = smooth.current;
    const v = vectors.current;
    const player = engine.player.position;
    const { grid, width, height } = engine.maze;

    s.yaw = MathUtils.damp(s.yaw, rig.yawIndex * (Math.PI / 2), 9, dt);
    s.blend = MathUtils.damp(s.blend, mode === 'aerial' ? 1 : 0, 4.5, dt);
    s.zoom = MathUtils.damp(s.zoom, rig.zoom, 8, dt);

    const forward = forwardFromYaw(s.yaw);
    const back = { x: -forward.x, z: -forward.z };
    // Distance behind the player to the first wall edge (ground-plane march).
    const free = occludedDistance(grid, player, back, s.zoom, 0, 0.3);
    // React fast when a wall appears behind, relax slowly to avoid popping.
    s.edge = MathUtils.damp(s.edge, free, free < s.edge ? 25 : 4, dt);

    // The chase camera flies above the wall tops, so side walls never block it.
    // When a wall stands behind the player (corners, junctions) it climbs until
    // the sight line to the head clears that wall's edge (similar triangles);
    // only past MAX_CHASE_HEIGHT does it move closer horizontally.
    const openHeight = CHASE_BASE_HEIGHT + s.zoom * CHASE_HEIGHT_PER_ZOOM;
    const blockedBehind = s.edge < s.zoom - 0.01;
    const clearHeight = blockedBehind
      ? SIGHT_TARGET_Y + (WALL_TOP + SIGHT_MARGIN - SIGHT_TARGET_Y) * (s.zoom / Math.max(s.edge, 0.3))
      : 0;
    const targetHeight = Math.min(Math.max(openHeight, clearHeight), MAX_CHASE_HEIGHT);
    const horizontal =
      clearHeight > MAX_CHASE_HEIGHT
        ? Math.max(0.6, ((MAX_CHASE_HEIGHT - SIGHT_TARGET_Y) * Math.max(s.edge, 0.3)) / (WALL_TOP + SIGHT_MARGIN - SIGHT_TARGET_Y))
        : s.zoom;
    s.height = MathUtils.damp(s.height, targetHeight, 7, dt);
    s.horizontal = MathUtils.damp(s.horizontal, horizontal, 7, dt);
    v.third.set(player.x + back.x * s.horizontal, s.height, player.z + back.z * s.horizontal);

    // Look ahead down the corridor; look at the player when the view is steep.
    const steepness = MathUtils.clamp((s.height - openHeight) / (MAX_CHASE_HEIGHT - openHeight), 0, 1);
    const lookAhead = MathUtils.lerp(1.6, 0.2, steepness);
    v.thirdLook.set(player.x + forward.x * lookAhead, 0.6, player.z + forward.z * lookAhead);

    const aerialHeight = 8 + Math.max(width, height) * 0.32;
    v.aerial.set(player.x, aerialHeight, player.z + aerialHeight * 0.12);
    v.aerialLook.set(player.x, 0, player.z);

    const t = MathUtils.smootherstep(s.blend, 0, 1);
    v.target.lerpVectors(v.third, v.aerial, t);
    v.look.lerpVectors(v.thirdLook, v.aerialLook, t);

    if (!s.initialized) {
      camera.position.copy(v.target);
      v.smoothedLook.copy(v.look);
      s.initialized = true;
    } else {
      const follow = 1 - Math.exp(-14 * dt);
      camera.position.lerp(v.target, follow);
      v.smoothedLook.lerp(v.look, follow);
    }
    camera.lookAt(v.smoothedLook);

    const fov = MathUtils.lerp(THIRD_PERSON_FOV, AERIAL_FOV, t);
    if (Math.abs(camera.fov - fov) > 0.01) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
  });

  return null;
};

export default CameraRig;
