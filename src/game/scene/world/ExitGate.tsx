import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  MathUtils,
  MeshStandardMaterial,
  ShaderMaterial,
  type Mesh,
  type Points,
  type PointLight,
} from 'three';
import type { ExitGate as ExitGatePlacement } from '../../core/dressing';
import { yawFromDirection } from '../../core/cameraMath';
import { getTextures } from '../../art/proceduralTextures';
import { createRandom } from '../../core/random';
import { setUniform } from './uniforms';

const PORTAL_VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Arched portal: rectangle up to the spring line, semicircle above it.
const PORTAL_FRAGMENT = /* glsl */ `
  uniform float uTime;
  uniform float uBurst;
  varying vec2 vUv;
  void main() {
    vec2 p = vec2(vUv.x * 2.0 - 1.0, vUv.y);
    // Plane is 2.92 tall: pillars end at 2.5 (uv 0.856), arch radius 0.42 (uv 0.144).
    float spring = 0.856;
    float inside = p.y < spring ? step(abs(p.x), 1.0) : step(length(vec2(p.x, (p.y - spring) / 0.144)), 1.0);
    if (inside < 0.5) discard;

    vec2 c = vec2(p.x, (p.y - 0.45) * 1.6);
    float r = length(c);
    float a = atan(c.y, c.x);
    float swirl = 0.5 + 0.5 * sin(a * 4.0 + r * 9.0 - uTime * 2.6);
    float rings = 0.5 + 0.5 * sin(r * 22.0 - uTime * 4.0);
    float core = smoothstep(1.1, 0.0, r);
    vec3 gold = vec3(2.6, 1.5, 0.45);
    vec3 white = vec3(3.2, 2.8, 1.9);
    vec3 col = mix(gold * 0.35, mix(gold, white, core), swirl * 0.6 + rings * 0.2);
    float edge = smoothstep(0.0, 0.08, 1.0 - abs(p.x)) * smoothstep(0.0, 0.06, p.y);
    float alpha = (0.35 + 0.65 * core) * (0.6 + 0.4 * swirl) * edge;
    // Victory flare: the gate floods with light.
    col = mix(col, white * 1.6, uBurst * 0.7);
    alpha = min(1.0, alpha * (1.0 + uBurst * 1.5));
    gl_FragColor = vec4(col * alpha, alpha);
  }
`;

const BEAM_FRAGMENT = /* glsl */ `
  uniform float uTime;
  varying vec2 vUv;
  void main() {
    float fade = pow(1.0 - vUv.y, 1.6) * smoothstep(0.0, 0.05, vUv.y);
    float shimmer = 0.75 + 0.25 * sin(vUv.y * 30.0 - uTime * 3.0 + vUv.x * 12.566);
    float a = fade * shimmer * 0.35;
    gl_FragColor = vec4(vec3(1.6, 1.0, 0.35) * a, a);
  }
`;

const MOTE_VERTEX = /* glsl */ `
  uniform float uTime;
  uniform float uScale;
  attribute float aSeed;
  varying float vAlpha;
  void main() {
    vec3 p = position;
    float life = fract(uTime * 0.18 + aSeed);
    p.y += life * 3.2;
    p.x += sin(uTime * 1.3 + aSeed * 30.0) * 0.12;
    p.z += cos(uTime * 1.1 + aSeed * 17.0) * 0.12;
    vAlpha = sin(life * 3.14159);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = 0.09 * projectionMatrix[1][1] * uScale / -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const MOTE_FRAGMENT = /* glsl */ `
  uniform sampler2D uMap;
  varying float vAlpha;
  void main() {
    float a = texture2D(uMap, gl_PointCoord).a * vAlpha;
    gl_FragColor = vec4(vec3(3.0, 2.0, 0.8) * a, a);
  }
`;

interface ExitGateProps {
  gate: ExitGatePlacement;
  /** The hero just escaped through this gate. */
  celebrating?: boolean;
}

/**
 * The goal: a stone archway rising above the walls (visible landmark), a
 * swirling golden portal, a light beacon and rising motes.
 */
const ExitGate = ({ gate, celebrating = false }: ExitGateProps) => {
  const burst = useRef(0);
  const drawingHeight = useThree((s) => s.size.height);
  const lightRef = useRef<PointLight>(null);
  const portalRef = useRef<Mesh>(null);
  const beamRef = useRef<Mesh>(null);
  const motesRef = useRef<Points>(null);
  const textures = getTextures();

  const resources = useMemo(() => {
    const stone = new MeshStandardMaterial({
      map: textures.roughStone.map,
      bumpMap: textures.roughStone.bumpMap,
      bumpScale: 1.5,
      color: '#b9ad9c',
      roughness: 0.9,
    });
    const gold = new MeshStandardMaterial({ color: '#c99a3a', metalness: 0.9, roughness: 0.35 });
    const portal = new ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uBurst: { value: 0 } },
      vertexShader: PORTAL_VERTEX,
      fragmentShader: PORTAL_FRAGMENT,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      side: DoubleSide,
    });
    const beam = new ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      vertexShader: PORTAL_VERTEX,
      fragmentShader: BEAM_FRAGMENT,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      side: DoubleSide,
    });

    const random = createRandom(2024);
    const count = 40;
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions.set([(random() - 0.5) * 0.8, random() * 0.3, (random() - 0.5) * 0.8], i * 3);
      seeds[i] = random();
    }
    const moteGeometry = new BufferGeometry();
    moteGeometry.setAttribute('position', new BufferAttribute(positions, 3));
    moteGeometry.setAttribute('aSeed', new BufferAttribute(seeds, 1));
    const motes = new ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uScale: { value: 400 }, uMap: { value: textures.glow } },
      vertexShader: MOTE_VERTEX,
      fragmentShader: MOTE_FRAGMENT,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    });
    return { stone, gold, portal, beam, moteGeometry, motes };
  }, [textures]);

  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime;
    burst.current = MathUtils.damp(burst.current, celebrating ? 1 : 0, 3, Math.min(delta, 0.1));
    setUniform(portalRef.current, 'uTime', t);
    setUniform(portalRef.current, 'uBurst', burst.current);
    if (beamRef.current) beamRef.current.scale.set(1 + burst.current * 1.5, 1, 1 + burst.current * 1.5);
    setUniform(beamRef.current, 'uTime', t);
    setUniform(motesRef.current, 'uTime', t);
    setUniform(motesRef.current, 'uScale', drawingHeight / 2);
    if (lightRef.current) lightRef.current.intensity = 7 + Math.sin(t * 2.2) * 1.5 + burst.current * 22;
  });

  // Local frame: +z points toward the approach corridor, x spans the arch.
  const yaw = yawFromDirection(gate.facing);
  const pillarHeight = 2.5;
  const archRadius = 0.42;

  return (
    <group position={[gate.cell.x, 0, gate.cell.z]} rotation={[0, yaw, 0]} name="exit-gate">
      {[-1, 1].map((side) => (
        <group key={side} position={[side * (archRadius + 0.06), 0, 0.1]}>
          <mesh position={[0, 0.09, 0]} material={resources.stone} castShadow receiveShadow>
            <boxGeometry args={[0.3, 0.18, 0.36]} />
          </mesh>
          <mesh position={[0, pillarHeight / 2, 0]} material={resources.stone} castShadow receiveShadow>
            <boxGeometry args={[0.2, pillarHeight, 0.28]} />
          </mesh>
          <mesh position={[0, pillarHeight - 0.05, 0]} material={resources.stone} castShadow>
            <boxGeometry args={[0.28, 0.1, 0.34]} />
          </mesh>
        </group>
      ))}
      {/* Arch ring with keystone and gilded trim. */}
      <mesh position={[0, pillarHeight, 0.1]} material={resources.stone} castShadow>
        <torusGeometry args={[archRadius + 0.06, 0.1, 10, 24, Math.PI]} />
      </mesh>
      <mesh position={[0, pillarHeight, 0.1]} material={resources.gold}>
        <torusGeometry args={[archRadius - 0.04, 0.018, 6, 24, Math.PI]} />
      </mesh>
      <mesh position={[0, pillarHeight + archRadius + 0.12, 0.1]} material={resources.stone} castShadow>
        <boxGeometry args={[0.18, 0.26, 0.3]} />
      </mesh>
      <mesh position={[0, pillarHeight + archRadius + 0.14, 0.26]} material={resources.gold}>
        <octahedronGeometry args={[0.06, 0]} />
      </mesh>

      {/* Portal surface (arched), sized to the opening. */}
      <mesh position={[0, (pillarHeight + archRadius) / 2, 0.1]} ref={portalRef} material={resources.portal} renderOrder={2}>
        <planeGeometry args={[archRadius * 2, pillarHeight + archRadius]} />
      </mesh>

      {/* Beacon shaft visible across the maze and from the aerial view. */}
      <mesh position={[0, 6, 0]} ref={beamRef} material={resources.beam} renderOrder={3}>
        <cylinderGeometry args={[0.35, 0.5, 12, 16, 1, true]} />
      </mesh>
      <points ref={motesRef} geometry={resources.moteGeometry} material={resources.motes} frustumCulled={false} />

      <pointLight
        ref={lightRef}
        position={[0, 1.4, 0.6]}
        color={new Color('#ffc46b')}
        intensity={7}
        distance={6}
        decay={1.5}
      />
    </group>
  );
};

export default ExitGate;
