/**
 * Procedural walk cycle driven by distance travelled (not time), so feet
 * never slide regardless of movement speed. Pure math: the scene maps the
 * normalized pose onto joint rotations.
 */

export interface GaitState {
  /** Walk cycle angle; advances π per stride. */
  phase: number;
  /** 0 = idle pose, 1 = full walk; damped between them. */
  weight: number;
  lastX: number;
  lastZ: number;
  initialized: boolean;
}

/** Normalized joint drive values in -1..1 (knees and bob in 0..1). */
export interface GaitPose {
  leftLeg: number;
  rightLeg: number;
  leftKnee: number;
  rightKnee: number;
  leftArm: number;
  rightArm: number;
  bob: number;
}

/** Larger per-frame jumps are teleports (new run, respawn), not steps. */
const TELEPORT_DISTANCE = 1.5;

export const createGait = (): GaitState => ({ phase: 0, weight: 0, lastX: 0, lastZ: 0, initialized: false });

export const advanceGait = (
  gait: GaitState,
  x: number,
  z: number,
  dt: number,
  strideLength: number,
  blendRate = 10,
): void => {
  let distance = 0;
  if (gait.initialized) {
    distance = Math.hypot(x - gait.lastX, z - gait.lastZ);
    if (distance > TELEPORT_DISTANCE) distance = 0;
  }
  gait.lastX = x;
  gait.lastZ = z;
  gait.initialized = true;

  gait.phase += (distance / strideLength) * Math.PI;
  const moving = distance > 1e-5;
  const target = moving ? 1 : 0;
  gait.weight += (target - gait.weight) * (1 - Math.exp(-blendRate * dt));
  if (!moving && gait.weight < 1e-3) gait.weight = 0;
};

export const gaitPose = (phase: number, weight: number): GaitPose => {
  const swing = Math.sin(phase) * weight;
  const lift = Math.cos(phase);
  return {
    leftLeg: swing,
    rightLeg: -swing,
    leftKnee: Math.max(0, -lift) * weight,
    rightKnee: Math.max(0, lift) * weight,
    leftArm: -swing,
    rightArm: swing,
    bob: Math.abs(lift) * weight,
  };
};
