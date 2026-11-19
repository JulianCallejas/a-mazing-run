import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import {
  AdditiveBlending,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  Color,
  CylinderGeometry,
  InstancedMesh,
  LatheGeometry,
  Matrix4,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  PointLight,
  ShaderMaterial,
  Vector2,
  Vector3,
  type Group,
  type Points,
} from 'three';
import type { GameEngine } from '../../core/engine';
import type { TorchPlacement } from '../../core/dressing';
import { DIRECTION_VECTORS } from '../../core/engine';
import { yawFromDirection } from '../../core/cameraMath';
import { getTextures } from '../../art/proceduralTextures';
import type { Atmosphere } from '../../art/atmosphere';
import { setUniform } from './uniforms';

const MOUNT_HEIGHT = 1.25;
const LIGHT_POOL_SIZE = 6;
const LIGHT_FADE_START = 5;
const LIGHT_FADE_END = 9;

/** Local transforms of each sconce part, relative to the torch origin on the wall face. */
const PARTS = {
  plate: new Matrix4().compose(new Vector3(0, 0, 0.015), new Object3D().quaternion, new Vector3(1, 1, 1)),
  handle: (() => {
    const o = new Object3D();
    o.position.set(0, 0.06, 0.11);
    o.rotation.x = 0.38;
    o.updateMatrix();
    return o.matrix.clone();
  })(),
  cup: (() => {
    const o = new Object3D();
    o.position.set(0, 0.21, 0.175);
    o.rotation.x = 0.38;
    o.updateMatrix();
    return o.matrix.clone();
  })(),
};
const FLAME_LOCAL = new Vector3(0, 0.25, 0.19);

const flameGeometry = () => {
  // Teardrop lathe profile: wide base, pointed tip.
  const points = [
    new Vector2(0, 0),
    new Vector2(0.045, 0.02),
    new Vector2(0.055, 0.06),
    new Vector2(0.04, 0.12),
    new Vector2(0.018, 0.18),
    new Vector2(0, 0.22),
  ];
  return new LatheGeometry(points, 10);
};

const GLOW_VERTEX = /* glsl */ `
  uniform float uTime;
  uniform float uSize;
  uniform float uScale;
  attribute float aSeed;
  varying float vFlicker;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vFlicker = 0.8 + 0.2 * sin(uTime * 13.0 + aSeed * 21.0) * sin(uTime * 7.3 + aSeed * 3.0);
    gl_PointSize = uSize * vFlicker * projectionMatrix[1][1] * uScale / -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const GLOW_FRAGMENT = /* glsl */ `
  uniform sampler2D uMap;
  uniform vec3 uColor;
  varying float vFlicker;
  void main() {
    float a = texture2D(uMap, gl_PointCoord).a;
    gl_FragColor = vec4(uColor * a * vFlicker, a * vFlicker);
  }
`;

interface TorchesProps {
  torches: TorchPlacement[];
  engine: GameEngine;
  atmosphere: Atmosphere;
}

/**
 * Wall sconces with animated flames. Only LIGHT_POOL_SIZE real point lights
 * exist; every few frames they are reassigned to the torches nearest the
 * player and faded by distance, so reassignment never pops on screen.
 */
const Torches = ({ torches, engine, atmosphere }: TorchesProps) => {
  const drawingHeight = useThree((s) => s.size.height);
  const plateRef = useRef<InstancedMesh>(null);
  const handleRef = useRef<InstancedMesh>(null);
  const cupRef = useRef<InstancedMesh>(null);
  const outerFlameRef = useRef<InstancedMesh>(null);
  const innerFlameRef = useRef<InstancedMesh>(null);
  const lightsRef = useRef<Group>(null);
  const glowRef = useRef<Points>(null);
  const assignment = useRef({ nextUpdate: 0, indices: [] as number[] });

  const { torchMatrices, flamePositions, lightOffsets } = useMemo(() => {
    const helper = new Object3D();
    const matrices: Matrix4[] = [];
    const flames: Vector3[] = [];
    const offsets: Vector3[] = [];
    for (const torch of torches) {
      helper.position.set(torch.x, MOUNT_HEIGHT, torch.z);
      helper.rotation.set(0, yawFromDirection(torch.facing), 0);
      helper.updateMatrix();
      matrices.push(helper.matrix.clone());
      flames.push(FLAME_LOCAL.clone().applyMatrix4(helper.matrix));
      const v = DIRECTION_VECTORS[torch.facing];
      offsets.push(new Vector3(v.x * 0.25, 0.1, v.z * 0.25));
    }
    return { torchMatrices: matrices, flamePositions: flames, lightOffsets: offsets };
  }, [torches]);

  const resources = useMemo(() => {
    const iron = new MeshStandardMaterial({ color: '#2b2a2c', metalness: 0.85, roughness: 0.45 });
    const wood = new MeshStandardMaterial({ color: '#4a2f1c', roughness: 0.85 });
    const glowGeometry = new BufferGeometry();
    const positions = new Float32Array(flamePositions.length * 3);
    const seeds = new Float32Array(flamePositions.length);
    flamePositions.forEach((p, i) => {
      positions.set([p.x, p.y + 0.08, p.z], i * 3);
      seeds[i] = i * 0.37;
    });
    glowGeometry.setAttribute('position', new BufferAttribute(positions, 3));
    glowGeometry.setAttribute('aSeed', new BufferAttribute(seeds, 1));
    const glowMaterial = new ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uSize: { value: 0.6 },
        uScale: { value: 400 },
        uMap: { value: getTextures().glow },
        uColor: { value: new Color(atmosphere.torch.color).multiplyScalar(0.9) },
      },
      vertexShader: GLOW_VERTEX,
      fragmentShader: GLOW_FRAGMENT,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    });
    return {
      plateGeometry: new BoxGeometry(0.1, 0.2, 0.03),
      handleGeometry: new CylinderGeometry(0.022, 0.03, 0.3, 8),
      cupGeometry: new CylinderGeometry(0.06, 0.04, 0.07, 10, 1, true),
      outerFlameGeometry: flameGeometry(),
      iron,
      wood,
      outerFlame: new MeshBasicMaterial({ color: new Color(3.2, 1.15, 0.22), toneMapped: false }),
      innerFlame: new MeshBasicMaterial({ color: new Color(3.6, 2.7, 1.2), toneMapped: false }),
      glowGeometry,
      glowMaterial,
    };
  }, [flamePositions, atmosphere.torch.color]);

  useLayoutEffect(() => {
    const composed = new Matrix4();
    const apply = (mesh: InstancedMesh | null, local: Matrix4) => {
      if (!mesh) return;
      torchMatrices.forEach((m, i) => mesh.setMatrixAt(i, composed.multiplyMatrices(m, local)));
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
    };
    apply(plateRef.current, PARTS.plate);
    apply(handleRef.current, PARTS.handle);
    apply(cupRef.current, PARTS.cup);
  }, [torchMatrices]);

  const scratch = useMemo(() => ({ object: new Object3D(), distances: [] as number[] }), []);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    setUniform(glowRef.current, 'uTime', t);
    setUniform(glowRef.current, 'uScale', drawingHeight / 2);

    // Flames: per-instance flicker via scale; cheap for a few dozen torches.
    const o = scratch.object;
    flamePositions.forEach((p, i) => {
      const flicker = 0.85 + 0.15 * Math.sin(t * 11 + i * 1.7) * Math.sin(t * 5.3 + i);
      const sway = Math.sin(t * 6 + i * 2.1) * 0.08;
      o.position.copy(p);
      o.rotation.set(sway, i, sway * 0.5);
      o.scale.set(1, flicker * 1.1, 1);
      o.updateMatrix();
      outerFlameRef.current?.setMatrixAt(i, o.matrix);
      o.scale.set(0.55, flicker * 0.7, 0.55);
      o.updateMatrix();
      innerFlameRef.current?.setMatrixAt(i, o.matrix);
    });
    if (outerFlameRef.current) outerFlameRef.current.instanceMatrix.needsUpdate = true;
    if (innerFlameRef.current) innerFlameRef.current.instanceMatrix.needsUpdate = true;

    // Light pool: reassign to the nearest torches a few times per second.
    const player = engine.player.position;
    const state = assignment.current;
    if (t >= state.nextUpdate) {
      state.nextUpdate = t + 0.2;
      state.indices = flamePositions
        .map((p, i) => ({ i, d: (p.x - player.x) ** 2 + (p.z - player.z) ** 2 }))
        .sort((a, b) => a.d - b.d)
        .slice(0, LIGHT_POOL_SIZE)
        .map((e) => e.i);
    }
    const lights = lightsRef.current?.children as PointLight[] | undefined;
    if (!lights) return;
    lights.forEach((light, slot) => {
      const index = state.indices[slot];
      if (index === undefined) {
        light.intensity = 0;
        return;
      }
      const p = flamePositions[index];
      light.position.copy(p).add(lightOffsets[index]);
      const distance = Math.hypot(p.x - player.x, p.z - player.z);
      const fade = 1 - Math.min(1, Math.max(0, (distance - LIGHT_FADE_START) / (LIGHT_FADE_END - LIGHT_FADE_START)));
      const flicker = 0.82 + 0.18 * Math.sin(t * 9.7 + index * 1.3) * Math.sin(t * 4.1 + index * 0.7);
      light.intensity = atmosphere.torch.intensity * fade * flicker;
    });
  });

  if (torches.length === 0) return null;
  const count = torches.length;

  return (
    <group name="torches">
      <instancedMesh ref={plateRef} args={[resources.plateGeometry, resources.iron, count]} castShadow />
      <instancedMesh ref={handleRef} args={[resources.handleGeometry, resources.wood, count]} castShadow />
      <instancedMesh ref={cupRef} args={[resources.cupGeometry, resources.iron, count]} />
      <instancedMesh ref={outerFlameRef} args={[resources.outerFlameGeometry, resources.outerFlame, count]} />
      <instancedMesh ref={innerFlameRef} args={[resources.outerFlameGeometry, resources.innerFlame, count]} />
      <points ref={glowRef} geometry={resources.glowGeometry} material={resources.glowMaterial} frustumCulled={false} />
      <group ref={lightsRef}>
        {Array.from({ length: LIGHT_POOL_SIZE }, (_, i) => (
          <pointLight key={i} color={atmosphere.torch.color} intensity={0} distance={7} decay={1.6} />
        ))}
      </group>
    </group>
  );
};

export default Torches;
