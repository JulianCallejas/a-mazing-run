import { useLayoutEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { MathUtils, PMREMGenerator, type DirectionalLight, type HemisphereLight } from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { Maze } from '../../core/maze';
import { MOON_DIRECTION, type Atmosphere } from '../../art/atmosphere';
import type { CameraMode } from '../../core/controls';
import { audioSystem } from '../../../systems/AudioSystem';
import { QUALITY } from '../../art/quality';

/** Extra exposure in the aerial (map) view so routes stay readable in any weather. */
const AERIAL_EXPOSURE_BOOST = 0.55;

interface LightingProps {
  maze: Maze;
  atmosphere: Atmosphere;
  cameraMode?: CameraMode;
}

/**
 * Moonlight key (the only shadow caster, fitted to the maze), hemisphere
 * fill, a dim neutral environment for metal reads, exposure per atmosphere
 * (boosted in the aerial map view), and optional lightning flashes.
 */
const Lighting = ({ maze, atmosphere, cameraMode = 'third-person' }: LightingProps) => {
  const get = useThree((s) => s.get);
  const moonRef = useRef<DirectionalLight>(null);
  const hemiRef = useRef<HemisphereLight>(null);
  const lightning = useRef({ next: 6, flashUntil: 0, thunderAt: Infinity });
  const aerialBlend = useRef(cameraMode === 'aerial' ? 1 : 0);

  const cx = (maze.width - 1) / 2;
  const cz = (maze.height - 1) / 2;
  const span = Math.max(maze.width, maze.height) * 0.75 + 2;
  const distance = 40;

  useLayoutEffect(() => {
    const { gl, scene } = get();
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
  }, [get, cx, cz]);

  useFrame(({ clock, gl }, delta) => {
    aerialBlend.current = MathUtils.damp(aerialBlend.current, cameraMode === 'aerial' ? 1 : 0, 4.5, Math.min(delta, 0.1));
    gl.toneMappingExposure = atmosphere.exposure * (1 + AERIAL_EXPOSURE_BOOST * aerialBlend.current);

    if (!atmosphere.lightning || !hemiRef.current) return;
    const t = clock.elapsedTime;
    const state = lightning.current;
    if (t >= state.next) {
      state.flashUntil = t + 0.35;
      // Thunder follows the flash after a short, distance-like delay.
      state.thunderAt = t + 0.4 + Math.random() * 0.8;
      state.next = t + 7 + ((Math.sin(t * 12.9898) * 43758.5453) % 1 + 1) * 5;
    }
    if (t >= state.thunderAt) {
      state.thunderAt = Infinity;
      audioSystem.playSoundEffect('thunder', 0.9);
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
        shadow-mapSize={[QUALITY.shadowMapSize, QUALITY.shadowMapSize]}
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
