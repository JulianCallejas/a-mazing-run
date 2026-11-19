import { useMemo } from 'react';
import { Environment } from '@react-three/drei';
import { Cell, type MazeGrid } from '../core/maze';
import type { VisualEffect } from '../core/scoring';

// Particle positions are generated once at module load so renders stay pure.
// Static and unanimated for now; replaced by GPU particles in T5.
const randomParticlePositions = (count: number): Array<[number, number, number]> =>
  Array.from({ length: count }, () => [
    (Math.random() - 0.5) * 60,
    Math.random() * 20 + 10,
    (Math.random() - 0.5) * 60,
  ]);
const SNOW_POSITIONS = randomParticlePositions(200);
const RAIN_POSITIONS = randomParticlePositions(300);

const Effects = ({ effect }: { effect: VisualEffect }) => {
  if (effect === 'FOG') return <fog attach="fog" args={['#666666', 8, 25]} />;
  if (effect === 'SNOW') {
    return (
      <>
        <fog attach="fog" args={['#E6F3FF', 10, 30]} />
        {SNOW_POSITIONS.map((position, i) => (
          <mesh key={`snow-${i}`} position={position}>
            <sphereGeometry args={[0.02]} />
            <meshBasicMaterial color="#FFFFFF" transparent opacity={0.8} />
          </mesh>
        ))}
      </>
    );
  }
  if (effect === 'RAIN') {
    return (
      <>
        <fog attach="fog" args={['#4A5568', 6, 20]} />
        {RAIN_POSITIONS.map((position, i) => (
          <mesh key={`rain-${i}`} position={position} rotation={[0, 0, Math.PI / 6]}>
            <cylinderGeometry args={[0.005, 0.005, 0.3]} />
            <meshBasicMaterial color="#87CEEB" transparent opacity={0.6} />
          </mesh>
        ))}
      </>
    );
  }
  return null;
};

const MazeGeometry = ({ grid }: { grid: MazeGrid }) => {
  const cells = useMemo(
    () =>
      grid.flatMap((row, z) =>
        row.map((cell, x) => {
          if (cell === Cell.Wall) {
            return (
              <mesh key={`wall-${x}-${z}`} position={[x, 1, z]} castShadow receiveShadow>
                <boxGeometry args={[1, 2, 1]} />
                <meshStandardMaterial color="#555555" roughness={0.9} metalness={0.1} />
              </mesh>
            );
          }
          return (
            <group key={`floor-${x}-${z}`}>
              <mesh position={[x, -0.05, z]} receiveShadow>
                <boxGeometry args={[1, 0.1, 1]} />
                <meshStandardMaterial color="#8B4513" roughness={0.8} metalness={0.1} />
              </mesh>
              {cell === Cell.Exit && (
                <mesh position={[x, 0.1, z]}>
                  <cylinderGeometry args={[0.4, 0.4, 0.2]} />
                  <meshStandardMaterial color="#FFD700" emissive="#FFAA00" emissiveIntensity={0.3} />
                </mesh>
              )}
            </group>
          );
        }),
      ),
    [grid],
  );
  return <>{cells}</>;
};

interface MazeWorldProps {
  grid: MazeGrid;
  effect: VisualEffect;
}

/** Maze, lights and weather. Visual upgrade (instancing, materials, VFX) lands in T5. */
const MazeWorld = ({ grid, effect }: MazeWorldProps) => (
  <>
    <Effects effect={effect} />
    <ambientLight intensity={effect === 'RAIN' ? 0.2 : 0.4} />
    <directionalLight
      position={[10, 10, 5]}
      intensity={effect === 'RAIN' ? 0.5 : 0.8}
      castShadow
      shadow-mapSize-width={2048}
      shadow-mapSize-height={2048}
    />
    <Environment preset={effect === 'RAIN' ? 'night' : 'sunset'} />
    <MazeGeometry grid={grid} />
  </>
);

export default MazeWorld;
