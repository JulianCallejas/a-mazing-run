import { useLayoutEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { PMREMGenerator, type DirectionalLight, type HemisphereLight } from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { Maze } from '../../core/maze';
import { MOON_DIRECTION, type Atmosphere } from '../../art/atmosphere';

interface LightingProps {
  maze: Maze;
  atmosphere: Atmosphere;
}

/**
 * Moonlight key (the only shadow caster, fitted to the maze), hemisphere
 * fill, a dim neutral environment for metal reads, exposure per atmosphere,
 * and optional lightning flashes.
 */
const Lighting = ({ maze, atmosphere }: LightingProps) => {
  const get = useThree((s) => s.get);
  const moonRef = useRef<DirectionalLight>(null);
  const hemiRef = useRef<HemisphereLight>(null);
  const lightning = useRef({ next: 6, flashUntil: 0 });

  const cx = (maze.width - 1) / 2;
  const cz = (maze.height - 1) / 2;
  const span = Math.max(maze.width, maze.height) * 0.75 + 2;
  const distance = 40;

  useLayoutEffect(() => {
    const { gl, scene } = get();
    gl.toneMappingExposure = atmosphere.exposure;
    const pmrem = new PMREMGenerator(gl);
    const environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = environment;
    scene.environmentIntensity = 0.18;
    pmrem.dispose();

    const moon = moonRef.current;
    if (moon) {
      moon.target.position.set(cx, 0, cz);
      scene.add(moon.target);
    }
    return () => {
      scene.environment = null;
      environment.dispose();
      if (moon) scene.remove(moon.target);
    };
  }, [get, atmosphere.exposure, cx, cz]);

  useFrame(({ clock }) => {
    if (!atmosphere.lightning || !hemiRef.current) return;
    const t = clock.elapsedTime;
    const state = lightning.current;
    if (t >= state.next) {
      state.flashUntil = t + 0.35;
      state.next = t + 7 + ((Math.sin(t * 12.9898) * 43758.5453) % 1 + 1) * 5;
    }
    const flashing = t < state.flashUntil;
    // Double-strobe envelope.
    const phase = flashing ? (state.flashUntil - t) / 0.35 : 0;
    const strobe = flashing ? Math.max(0, Math.sin(phase * Math.PI * 3)) : 0;
    hemiRef.current.intensity = atmosphere.hemisphere.intensity + strobe * 2.2;
  });

  return (
    <>
      <hemisphereLight
        ref={hemiRef}
        args={[atmosphere.hemisphere.sky, atmosphere.hemisphere.ground, atmosphere.hemisphere.intensity]}
      />
      <directionalLight
        ref={moonRef}
        color={atmosphere.moon.color}
        intensity={atmosphere.moon.intensity}
        position={[cx + MOON_DIRECTION[0] * distance, MOON_DIRECTION[1] * distance, cz + MOON_DIRECTION[2] * distance]}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
        shadow-camera-left={-span}
        shadow-camera-right={span}
        shadow-camera-top={span}
        shadow-camera-bottom={-span}
        shadow-camera-near={1}
        shadow-camera-far={distance * 2.5}
      />
    </>
  );
};

export default Lighting;
