import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { MathUtils, type Group } from 'three';
import type { Actor } from '../core/engine';
import { dampAngle, yawFromDirection } from '../core/cameraMath';

/**
 * Syncs a group with an engine actor every frame: interpolated position,
 * damped facing and a small walking bob on the inner body group.
 */
const useActorTransform = (actor: Readonly<Actor>, bobHeight: number) => {
  const root = useRef<Group>(null);
  const body = useRef<Group>(null);
  const started = useRef(false);

  useFrame(({ clock }, delta) => {
    const group = root.current;
    if (!group) return;
    const dt = Math.min(delta, 0.1);
    const targetYaw = yawFromDirection(actor.facing);

    group.position.set(actor.position.x, 0, actor.position.z);
    group.rotation.y = started.current ? dampAngle(group.rotation.y, targetYaw, 16, dt) : targetYaw;
    started.current = true;

    if (body.current) {
      const bob = actor.moving ? Math.abs(Math.sin(clock.elapsedTime * 14)) * bobHeight : 0;
      body.current.position.y = MathUtils.damp(body.current.position.y, bob, 20, dt);
    }
  });

  return { root, body };
};

/** Temporary hero model; replaced by the articulated character in T6. */
export const PlayerAvatar = ({ actor }: { actor: Readonly<Actor> }) => {
  const { root, body } = useActorTransform(actor, 0.06);
  return (
    <group ref={root}>
      <group ref={body}>
        <mesh position={[0, 0.55, 0]} castShadow>
          <capsuleGeometry args={[0.22, 0.5, 6, 12]} />
          <meshStandardMaterial color="#4A90E2" />
        </mesh>
        <mesh position={[0, 1.12, 0]} castShadow>
          <sphereGeometry args={[0.18, 16, 12]} />
          <meshStandardMaterial color="#FFE4B5" />
        </mesh>
        <mesh position={[-0.07, 1.16, 0.15]}>
          <sphereGeometry args={[0.03, 8, 6]} />
          <meshStandardMaterial color="#000000" />
        </mesh>
        <mesh position={[0.07, 1.16, 0.15]}>
          <sphereGeometry args={[0.03, 8, 6]} />
          <meshStandardMaterial color="#000000" />
        </mesh>
      </group>
    </group>
  );
};

/** Temporary guardian model; replaced by the armored guardian in T6. */
export const GuardianAvatar = ({ actor }: { actor: Readonly<Actor> }) => {
  const { root, body } = useActorTransform(actor, 0.04);
  return (
    <group ref={root}>
      <group ref={body}>
        <mesh position={[0, 0.5, 0]} castShadow>
          <boxGeometry args={[0.45, 0.9, 0.4]} />
          <meshStandardMaterial color="#8B0000" />
        </mesh>
        <mesh position={[-0.1, 0.75, 0.21]}>
          <sphereGeometry args={[0.05, 8, 6]} />
          <meshStandardMaterial color="#FF2200" emissive="#FF2200" emissiveIntensity={2} />
        </mesh>
        <mesh position={[0.1, 0.75, 0.21]}>
          <sphereGeometry args={[0.05, 8, 6]} />
          <meshStandardMaterial color="#FF2200" emissive="#FF2200" emissiveIntensity={2} />
        </mesh>
      </group>
    </group>
  );
};
