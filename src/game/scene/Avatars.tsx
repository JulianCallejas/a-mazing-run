import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, MathUtils, type Group, type Mesh, type MeshBasicMaterial } from 'three';
import type { Actor } from '../core/engine';
import { dampAngle, yawFromDirection } from '../core/cameraMath';
import { advanceGait, createGait, gaitPose } from '../core/gait';
import { buildHero, type HeroJoints } from '../art/characters/hero';
import { buildGuardian, type GuardianJoints } from '../art/characters/guardian';
import { getTextures } from '../art/proceduralTextures';

/** Soft dark blob that grounds a character on the floor (no shadow-map cost). */
const ContactShadow = ({ radius }: { radius: number }) => (
  <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]} renderOrder={1}>
    <planeGeometry args={[radius * 2, radius * 2]} />
    <meshBasicMaterial
      map={getTextures().glow}
      color="#000000"
      transparent
      opacity={0.55}
      depthWrite={false}
      polygonOffset
      polygonOffsetFactor={-2}
    />
  </mesh>
);

/** Places the root on the actor and turns it toward its facing (damped). */
const useRootFollow = (actor: Readonly<Actor>) => {
  const root = useRef<Group>(null);
  const started = useRef(false);
  const place = (dt: number) => {
    const group = root.current;
    if (!group) return null;
    const targetYaw = yawFromDirection(actor.facing);
    group.position.set(actor.position.x, 0, actor.position.z);
    group.rotation.y = started.current ? dampAngle(group.rotation.y, targetYaw, 14, dt) : targetYaw;
    started.current = true;
    return group;
  };
  return { root, place };
};

const HERO_STRIDE = 0.42;

interface PlayerAvatarProps {
  actor: Readonly<Actor>;
  /** Final pose: lantern raised on escape, collapse when caught. */
  outcome?: 'won' | 'lost' | null;
}

export const PlayerAvatar = ({ actor, outcome = null }: PlayerAvatarProps) => {
  const model = useMemo(() => buildHero(), []);
  const ending = useRef(0);
  const joints = useRef<HeroJoints | null>(null);
  const gait = useRef(createGait());
  const { root, place } = useRootFollow(actor);

  useLayoutEffect(() => {
    joints.current = model.joints;
  }, [model]);
  useEffect(() => () => model.dispose(), [model]);

  useFrame(({ clock }, delta) => {
    const dt = Math.min(delta, 0.1);
    const j = joints.current;
    if (!place(dt) || !j) return;
    const t = clock.elapsedTime;

    const g = gait.current;
    advanceGait(g, actor.position.x, actor.position.z, dt, HERO_STRIDE);
    const pose = gaitPose(g.phase, g.weight);
    const idle = 1 - g.weight;
    const breathe = Math.sin(t * 2.1) * idle;

    j.body.position.y = pose.bob * 0.035;
    j.leftLeg.rotation.x = -pose.leftLeg * 0.6;
    j.rightLeg.rotation.x = -pose.rightLeg * 0.6;
    j.leftKnee.rotation.x = pose.leftKnee * 0.9;
    j.rightKnee.rotation.x = pose.rightKnee * 0.9;

    j.torso.rotation.x = 0.1 * g.weight + breathe * 0.015;
    j.torso.rotation.y = pose.leftLeg * 0.08;
    j.head.rotation.x = -0.06 * g.weight + Math.sin(t * 0.7) * 0.03 * idle;
    j.head.rotation.y = Math.sin(t * 0.45) * 0.25 * idle;

    // Lantern arm raised forward; right arm swings freely.
    j.leftArm.rotation.x = -0.55 + pose.leftArm * 0.12;
    j.leftElbow.rotation.x = -0.75;
    j.rightArm.rotation.x = -pose.rightArm * 0.55;
    j.rightElbow.rotation.x = -0.25 - g.weight * 0.3;
    // Lantern hangs plumb with a little pendulum lag.
    j.lantern.rotation.x = -(j.leftArm.rotation.x + j.leftElbow.rotation.x) + Math.sin(g.phase) * 0.18 * g.weight;

    // Ending poses blend in over ~0.5 s.
    ending.current = MathUtils.damp(ending.current, outcome ? 1 : 0, 5, dt);
    const e = ending.current;
    if (outcome === 'won' && e > 0.001) {
      j.leftArm.rotation.x = MathUtils.lerp(j.leftArm.rotation.x, -2.6, e);
      j.leftElbow.rotation.x = MathUtils.lerp(j.leftElbow.rotation.x, -0.2, e);
      j.lantern.rotation.x = -(j.leftArm.rotation.x + j.leftElbow.rotation.x);
      j.head.rotation.x = MathUtils.lerp(j.head.rotation.x, -0.35, e);
    } else if (outcome === 'lost' && e > 0.001) {
      j.body.rotation.x = MathUtils.lerp(0, 1.35, e);
      j.body.position.y = MathUtils.lerp(j.body.position.y, 0.12, e);
      j.leftKnee.rotation.x = MathUtils.lerp(j.leftKnee.rotation.x, 1.1, e);
      j.rightKnee.rotation.x = MathUtils.lerp(j.rightKnee.rotation.x, 1.1, e);
    } else {
      j.body.rotation.x = 0;
    }

    j.cloak.rotation.x = 0.08 + g.weight * 0.3 + Math.sin(t * 2.7) * 0.025;
    const flicker = 0.9 + 0.1 * Math.sin(t * 13.3) * Math.sin(t * 7.1);
    const lanternBoost = outcome === 'won' ? 1 + ending.current * 1.5 : outcome === 'lost' ? 1 - ending.current * 0.85 : 1;
    j.lanternLight.intensity = 2.2 * flicker * lanternBoost;
    j.lanternCore.scale.setScalar(0.9 + flicker * 0.2);
  });

  return (
    <group ref={root}>
      <primitive object={model.root} />
      <ContactShadow radius={0.32} />
      {/* Hero locator: drawn on top of walls so the hero is never lost behind masonry. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]} renderOrder={10}>
        <ringGeometry args={[0.2, 0.235, 40]} />
        <meshBasicMaterial
          color="#f0d993"
          transparent
          opacity={0.13}
          depthTest={false}
          depthWrite={false}
          blending={AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
};

const GUARDIAN_STRIDE = 0.55;

interface GuardianAvatarProps {
  actor: Readonly<Actor>;
  target: Readonly<Actor>;
}

/**
 * Guardian with a readable threat state: dormant (dim visor, weapon lowered)
 * until it hunts; the visor, chest rune and a ground ring intensify as it
 * closes in on the hero, and its head tracks the hero.
 */
export const GuardianAvatar = ({ actor, target }: GuardianAvatarProps) => {
  const model = useMemo(() => buildGuardian(), []);
  const joints = useRef<GuardianJoints | null>(null);
  const ring = useRef<Mesh>(null);
  const gait = useRef(createGait());
  const awake = useRef(0);
  const { root, place } = useRootFollow(actor);

  useLayoutEffect(() => {
    joints.current = model.joints;
  }, [model]);
  useEffect(() => () => model.dispose(), [model]);

  useFrame(({ clock }, delta) => {
    const dt = Math.min(delta, 0.1);
    const j = joints.current;
    const group = place(dt);
    if (!group || !j) return;
    const t = clock.elapsedTime;

    const g = gait.current;
    advanceGait(g, actor.position.x, actor.position.z, dt, GUARDIAN_STRIDE, 7);
    const pose = gaitPose(g.phase, g.weight);
    awake.current = MathUtils.damp(awake.current, actor.moving || g.weight > 0.1 ? 1 : 0, 2.5, dt);

    const dx = target.position.x - actor.position.x;
    const dz = target.position.z - actor.position.z;
    const distance = Math.hypot(dx, dz);
    const danger = MathUtils.clamp(1 - (distance - 1) / 5, 0, 1);

    j.body.position.y = pose.bob * 0.05;
    j.leftLeg.rotation.x = -pose.leftLeg * 0.5;
    j.rightLeg.rotation.x = -pose.rightLeg * 0.5;
    j.leftKnee.rotation.x = pose.leftKnee * 0.75;
    j.rightKnee.rotation.x = pose.rightKnee * 0.75;
    j.torso.rotation.x = 0.14 * g.weight + (1 - awake.current) * 0.12;
    j.torso.rotation.y = pose.leftLeg * 0.06;
    j.leftArm.rotation.x = -pose.leftArm * 0.4;
    // Weapon arm: lowered while dormant, raised to guard when hunting.
    j.rightArm.rotation.x = MathUtils.lerp(0.1, -0.45, awake.current) + pose.rightArm * 0.08;
    j.cape.rotation.x = 0.06 + g.weight * 0.22 + Math.sin(t * 2.3) * 0.02;

    // Head tracks the hero within a natural range.
    const relative = Math.atan2(dx, dz) - group.rotation.y;
    const wrapped = Math.atan2(Math.sin(relative), Math.cos(relative));
    j.head.rotation.y = MathUtils.damp(j.head.rotation.y, MathUtils.clamp(wrapped, -0.7, 0.7) * awake.current, 6, dt);
    j.head.rotation.x = (1 - awake.current) * 0.25;

    const pulse = 0.5 + 0.5 * Math.sin(t * (4 + danger * 6));
    j.glow.emissiveIntensity = 0.6 + awake.current * 2.4 + danger * (2 + pulse * 2.5);

    const ringMaterial = ring.current?.material as MeshBasicMaterial | undefined;
    if (ringMaterial) ringMaterial.opacity = danger * awake.current * (0.35 + pulse * 0.35);
  });

  return (
    <group ref={root}>
      <primitive object={model.root} />
      <ContactShadow radius={0.4} />
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} renderOrder={2}>
        <ringGeometry args={[0.42, 0.5, 40]} />
        <meshBasicMaterial
          color="#ff3020"
          transparent
          opacity={0}
          depthWrite={false}
          blending={AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
};
