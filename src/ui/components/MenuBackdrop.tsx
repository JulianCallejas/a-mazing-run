import { Canvas, useFrame } from '@react-three/fiber';
import useGameStore from '../../store/useGameStore';
import { generateMaze } from '../../game/core/maze';
import MazeWorld from '../../game/scene/MazeWorld';

// The menu shows a fixed showcase maze; the focus point (torch lights,
// weather) travels with the orbiting camera. Module-level: owned by the
// frame loop, not by React state.
const BACKDROP_MAZE = generateMaze({ width: 21, height: 21, seed: 1118 });
const CENTER = { x: (BACKDROP_MAZE.width - 1) / 2, z: (BACKDROP_MAZE.height - 1) / 2 };
const FOCUS = { x: CENTER.x, z: CENTER.z };

const OrbitRig = () => {
  useFrame(({ camera, clock }) => {
    const a = clock.elapsedTime * 0.04 + 0.8;
    const radius = 16;
    camera.position.set(CENTER.x + Math.cos(a) * radius, 9.5, CENTER.z + Math.sin(a) * radius);
    // Frame the maze slightly right of center so the left menu column stays clear.
    camera.lookAt(CENTER.x - Math.sin(a) * 3, 0.5, CENTER.z + Math.cos(a) * 3);
    FOCUS.x = CENTER.x + Math.cos(a) * 5;
    FOCUS.z = CENTER.z + Math.sin(a) * 5;
  });
  return null;
};

/** Live 3D castle maze behind the menus; previews the selected weather. */
const MenuBackdrop = () => {
  const visualEffect = useGameStore((s) => s.visualEffect);
  return (
    <div className="fixed inset-0 -z-10" aria-hidden="true">
      <Canvas shadows="soft" dpr={[1, 1.5]} camera={{ fov: 45, near: 0.1, far: 320 }}>
        <OrbitRig />
        <MazeWorld maze={BACKDROP_MAZE} focus={FOCUS} effect={visualEffect} cameraMode="third-person" />
      </Canvas>
      {/* Legibility veil: darker on the menu side, open on the scene side. */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgb(7_8_13/0.92)_0%,rgb(7_8_13/0.7)_38%,rgb(7_8_13/0.15)_70%,rgb(7_8_13/0.35)_100%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgb(7_8_13/0.7)_100%)]" />
    </div>
  );
};

export default MenuBackdrop;
