import React from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import type { Actor, Direction } from '../../game/core/engine';
import { generateMaze } from '../../game/core/maze';
import { ATMOSPHERES } from '../../game/art/atmosphere';
import { GuardianAvatar, PlayerAvatar } from '../../game/scene/Avatars';
import Lighting from '../../game/scene/world/Lighting';
import PostFX from '../../game/scene/world/PostFX';
import RenderDiagnosticsProbe from '../../game/scene/RenderDiagnostics';

/**
 * QA-only character turntable (registered only with `?debug`): hero and
 * guardian walking back and forth under game lighting, so silhouettes,
 * materials and the gait can be inspected up close.
 */

const makeActor = (id: string, x: number, z: number): Actor => ({
  id,
  from: { x, z },
  to: { x, z },
  progress: 0,
  moving: false,
  facing: 'east',
  stepDuration: 0.4,
  position: { x, z },
});

// Module-level scene state: this debug screen's actors are plain objects that
// the frame loop animates, outside React's ownership.
const HERO = makeActor('hero', 0, 0.6);
const GUARDIAN = makeActor('guardian', 0, -0.6);
const ROUTES = [
  { actor: HERO, lane: 0.6, speed: 1.0 },
  { actor: GUARDIAN, lane: -0.6, speed: 0.8 },
];
const SHOWCASE_MAZE = generateMaze({ width: 10, height: 10, seed: 1 });

const Patrol = () => {
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    for (const { actor, lane, speed } of ROUTES) {
      // Walk 1.6 units east, pause, walk back west, pause.
      const cycle = (t * speed) % 4;
      const leg = cycle < 1.6 ? cycle : cycle < 2 ? 1.6 : cycle < 3.6 ? 3.6 - cycle : 0;
      const moving = (cycle > 0 && cycle < 1.6) || (cycle > 2 && cycle < 3.6);
      const facing: Direction = cycle < 2 ? 'east' : 'west';
      actor.position.x = -0.8 + leg;
      actor.position.z = lane;
      actor.moving = moving;
      actor.facing = moving ? facing : 'south';
    }
  });
  return null;
};

const ShowcaseScreen: React.FC = () => {
  const atmosphere = ATMOSPHERES.NONE;

  return (
    <div className="w-full h-screen bg-black">
      <Canvas shadows="soft" camera={{ fov: 40, position: [0, 1.5, 4.2] }} onCreated={({ camera }) => camera.lookAt(0, 0.65, 0)}>
        <color attach="background" args={['#0b0f1c']} />
        <Lighting maze={SHOWCASE_MAZE} atmosphere={atmosphere} />
        <pointLight position={[1.6, 1.6, 1.4]} color={atmosphere.torch.color} intensity={6} distance={7} decay={1.6} />
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[12, 12]} />
          <meshStandardMaterial color="#3a352f" roughness={0.9} />
        </mesh>
        <Patrol />
        <PlayerAvatar actor={HERO} />
        <GuardianAvatar actor={GUARDIAN} target={HERO} />
        <PostFX />
        <RenderDiagnosticsProbe />
      </Canvas>
    </div>
  );
};

export default ShowcaseScreen;
