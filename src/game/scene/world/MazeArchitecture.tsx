import { useLayoutEffect, useMemo, useRef } from 'react';
import {
  BoxGeometry,
  Color,
  DodecahedronGeometry,
  InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
} from 'three';
import { Cell, type Maze } from '../../core/maze';
import type { MazeDressing } from '../../core/dressing';
import { WALL_VARIANTS, getTextures } from '../../art/proceduralTextures';
import { yawFromDirection } from '../../core/cameraMath';
import type { Atmosphere } from '../../art/atmosphere';

const WALL_HEIGHT = 2;
const CAP_HEIGHT = 0.14;
const MERLON_HEIGHT = 0.28;

/** Cheap deterministic hash for per-cell variation. */
const hash = (x: number, z: number) => {
  const h = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return h - Math.floor(h);
};

interface InstanceSpec {
  matrix: Matrix4;
  color: Color;
}

/** Fills an InstancedMesh once from precomputed matrices/colors. */
const useInstances = (specs: InstanceSpec[]) => {
  const ref = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    specs.forEach((spec, i) => {
      mesh.setMatrixAt(i, spec.matrix);
      mesh.setColorAt(i, spec.color);
    });
    mesh.count = specs.length;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [specs]);
  return ref;
};

const WallVariant = ({ specs, variant }: { specs: InstanceSpec[]; variant: number }) => {
  const ref = useInstances(specs);
  const textures = getTextures().walls[variant];
  const geometry = useMemo(() => new BoxGeometry(1, WALL_HEIGHT, 1), []);
  const material = useMemo(
    () =>
      new MeshStandardMaterial({
        map: textures.map,
        bumpMap: textures.bumpMap,
        bumpScale: 2.2,
        roughness: 0.92,
        metalness: 0,
      }),
    [textures],
  );
  if (specs.length === 0) return null;
  return (
    <instancedMesh
      ref={ref}
      args={[geometry, material, specs.length]}
      castShadow
      receiveShadow
      name={`walls-${variant}`}
    />
  );
};

const InstancedSet = ({
  specs,
  geometry,
  material,
  name,
  castShadow = true,
}: {
  specs: InstanceSpec[];
  geometry: BoxGeometry | DodecahedronGeometry;
  material: MeshStandardMaterial;
  name: string;
  castShadow?: boolean;
}) => {
  const ref = useInstances(specs);
  if (specs.length === 0) return null;
  return (
    <instancedMesh
      ref={ref}
      args={[geometry, material, specs.length]}
      castShadow={castShadow}
      receiveShadow
      name={name}
    />
  );
};

interface MazeArchitectureProps {
  maze: Maze;
  dressing: MazeDressing;
  atmosphere: Atmosphere;
}

/**
 * Static maze geometry: instanced ashlar walls (3 texture variants), coping
 * stones, battlements, flagstone floor, outer ground, rubble and the start sigil.
 */
const MazeArchitecture = ({ maze, dressing, atmosphere }: MazeArchitectureProps) => {
  const textures = getTextures();

  const { wallSpecs, capSpecs } = useMemo(() => {
    const walls: InstanceSpec[][] = Array.from({ length: WALL_VARIANTS }, () => []);
    const caps: InstanceSpec[] = [];
    const helper = new Object3D();
    maze.grid.forEach((row, z) =>
      row.forEach((cell, x) => {
        if (cell !== Cell.Wall) return;
        const h = hash(x, z);
        helper.position.set(x, WALL_HEIGHT / 2, z);
        helper.rotation.set(0, 0, 0);
        helper.scale.set(1, 1, 1);
        helper.updateMatrix();
        const tint = 0.86 + h * 0.18;
        walls[Math.floor(h * WALL_VARIANTS) % WALL_VARIANTS].push({
          matrix: helper.matrix.clone(),
          color: new Color(tint, tint * 0.98, tint * 0.95),
        });

        // Coping stone: slightly wider than the wall, uneven height and tilt.
        helper.position.set(x, WALL_HEIGHT + CAP_HEIGHT / 2 - 0.02 + h * 0.03, z);
        helper.rotation.set((h - 0.5) * 0.03, 0, (hash(z, x) - 0.5) * 0.03);
        helper.scale.set(1.06, 1, 1.06);
        helper.updateMatrix();
        const capTint = 0.7 + hash(z, x) * 0.2;
        caps.push({ matrix: helper.matrix.clone(), color: new Color(capTint, capTint, capTint * 0.97) });
      }),
    );
    return { wallSpecs: walls, capSpecs: caps };
  }, [maze]);

  const rubbleSpecs = useMemo(() => {
    const helper = new Object3D();
    return dressing.rubble.map((stone) => {
      helper.position.set(stone.x, stone.scale * 0.45, stone.z);
      helper.rotation.set(stone.tint * 2, stone.rotation, stone.tint);
      helper.scale.set(stone.scale * 1.3, stone.scale * 0.8, stone.scale);
      helper.updateMatrix();
      const t = 0.55 + stone.tint * 0.35;
      return { matrix: helper.matrix.clone(), color: new Color(t, t * 0.95, t * 0.9) };
    });
  }, [dressing]);

  const merlonSpecs = useMemo(() => {
    const helper = new Object3D();
    return dressing.merlons.map((merlon) => {
      const h = hash(merlon.x * 3.1, merlon.z * 1.7);
      helper.position.set(merlon.x, WALL_HEIGHT + CAP_HEIGHT + MERLON_HEIGHT / 2 - 0.02, merlon.z);
      helper.rotation.set(0, yawFromDirection(merlon.facing) + (h - 0.5) * 0.06, 0);
      helper.scale.set(1, 0.9 + h * 0.2, 1);
      helper.updateMatrix();
      const t = 0.62 + h * 0.22;
      return { matrix: helper.matrix.clone(), color: new Color(t, t * 0.97, t * 0.93) };
    });
  }, [dressing]);

  const capGeometry = useMemo(() => new BoxGeometry(1, CAP_HEIGHT, 1), []);
  const merlonGeometry = useMemo(() => new BoxGeometry(0.3, MERLON_HEIGHT, 0.2), []);
  // Coping slabs reuse the flagstone pattern at half scale so wall tops read as masonry.
  const capMaterial = useMemo(() => {
    if (atmosphere.snowCover) {
      // Settled snow: bright, soft relief, no masonry pattern showing through.
      return new MeshStandardMaterial({
        color: '#e8eef6',
        bumpMap: textures.roughStone.bumpMap,
        bumpScale: 0.6,
        roughness: 0.85,
      });
    }
    const map = textures.floor.map.clone();
    const bumpMap = textures.floor.bumpMap.clone();
    for (const t of [map, bumpMap]) {
      t.repeat.set(0.5, 0.5);
      t.needsUpdate = true;
    }
    return new MeshStandardMaterial({ map, bumpMap, bumpScale: 2, color: '#8d877c', roughness: 0.95 });
  }, [textures, atmosphere.snowCover]);
  const rubbleGeometry = useMemo(() => new DodecahedronGeometry(1, 0), []);
  const stoneMaterial = useMemo(
    () =>
      new MeshStandardMaterial({
        map: textures.roughStone.map,
        bumpMap: textures.roughStone.bumpMap,
        bumpScale: 1.5,
        roughness: 0.95,
      }),
    [textures],
  );

  const floorGeometry = useMemo(() => {
    const geometry = new PlaneGeometry(maze.width, maze.height);
    geometry.rotateX(-Math.PI / 2);
    // 4 x 4 units per texture tile.
    const uv = geometry.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (maze.width / 4), uv.getY(i) * (maze.height / 4));
    return geometry;
  }, [maze]);

  const floorMaterial = useMemo(
    () =>
      new MeshStandardMaterial({
        map: textures.floor.map,
        bumpMap: textures.floor.bumpMap,
        bumpScale: 2,
        roughnessMap: textures.floor.roughnessMap,
        roughness: atmosphere.floorRoughness,
        metalness: 0,
      }),
    [textures, atmosphere.floorRoughness],
  );

  const groundSize = Math.max(maze.width, maze.height) * 6;
  const groundMaterial = useMemo(() => {
    const map = textures.roughStone.map.clone();
    map.repeat.set(groundSize / 3, groundSize / 3);
    map.needsUpdate = true;
    if (atmosphere.snowCover) {
      const bumpMap = textures.roughStone.bumpMap.clone();
      bumpMap.repeat.copy(map.repeat);
      bumpMap.needsUpdate = true;
      return new MeshStandardMaterial({ color: '#d5dce6', bumpMap, bumpScale: 0.8, roughness: 0.9 });
    }
    return new MeshStandardMaterial({ map, color: '#6f6c60', roughness: 1 });
  }, [textures, groundSize, atmosphere.snowCover]);

  const centerX = (maze.width - 1) / 2;
  const centerZ = (maze.height - 1) / 2;

  return (
    <group name="maze-architecture">
      {wallSpecs.map((specs, variant) => (
        <WallVariant key={variant} specs={specs} variant={variant} />
      ))}
      <InstancedSet specs={capSpecs} geometry={capGeometry} material={capMaterial} name="wall-caps" />
      <InstancedSet specs={merlonSpecs} geometry={merlonGeometry} material={capMaterial} name="merlons" />
      <InstancedSet
        specs={rubbleSpecs}
        geometry={rubbleGeometry}
        material={stoneMaterial}
        name="rubble"
        castShadow={false}
      />

      <mesh geometry={floorGeometry} material={floorMaterial} position={[centerX, 0, centerZ]} receiveShadow />
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[centerX, -0.03, centerZ]}
        material={groundMaterial}
        receiveShadow
      >
        <planeGeometry args={[groundSize, groundSize]} />
      </mesh>

      {/* Start sigil carved into the floor. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[maze.start.x, 0.012, maze.start.z]} renderOrder={1}>
        <planeGeometry args={[0.95, 0.95]} />
        <meshBasicMaterial
          map={textures.sigil}
          color="#ffb866"
          transparent
          opacity={0.55}
          depthWrite={false}
          polygonOffset
          polygonOffsetFactor={-1}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
};

export default MazeArchitecture;
