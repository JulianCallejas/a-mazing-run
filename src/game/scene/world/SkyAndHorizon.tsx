import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  AdditiveBlending,
  BackSide,
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  ShaderMaterial,
  MeshBasicMaterial,
  type Points,
  type Vector3Tuple,
} from 'three';
import { createRandom } from '../../core/random';
import { getTextures } from '../../art/proceduralTextures';
import type { Atmosphere } from '../../art/atmosphere';
import { setUniform } from './uniforms';

const SKY_VERTEX = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const SKY_FRAGMENT = /* glsl */ `
  uniform vec3 uZenith;
  uniform vec3 uHorizon;
  varying vec3 vDir;
  void main() {
    float h = clamp(vDir.y, 0.0, 1.0);
    vec3 col = mix(uHorizon, uZenith, pow(h, 0.55));
    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`;

const STAR_VERTEX = /* glsl */ `
  uniform float uTime;
  attribute float aSeed;
  varying float vTwinkle;
  void main() {
    vTwinkle = 0.55 + 0.45 * sin(uTime * (1.0 + aSeed * 3.0) + aSeed * 40.0);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = 1.2 + aSeed * 1.8;
    gl_Position = projectionMatrix * mv;
  }
`;

const STAR_FRAGMENT = /* glsl */ `
  uniform float uOpacity;
  varying float vTwinkle;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d) * vTwinkle * uOpacity;
    gl_FragColor = vec4(vec3(0.9, 0.95, 1.0) * a, a);
  }
`;

/** Builds a closed ring of jagged silhouette (mountains, with optional towers). */
const silhouetteRing = (radius: number, baseHeight: number, roughness: number, seed: number) => {
  const random = createRandom(seed);
  const segments = 160;
  const phases = Array.from({ length: 5 }, () => random() * Math.PI * 2);
  const heights: number[] = [];
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    let h = baseHeight;
    h += Math.sin(a * 3 + phases[0]) * roughness * 0.5;
    h += Math.sin(a * 7 + phases[1]) * roughness * 0.3;
    h += Math.sin(a * 17 + phases[2]) * roughness * 0.15;
    h += (random() - 0.5) * roughness * 0.25;
    heights.push(Math.max(1, h));
  }
  // Castle keeps: flat-topped spikes on a few segments.
  const towers = Math.floor(3 + random() * 3);
  for (let t = 0; t < towers; t++) {
    const at = Math.floor(random() * segments);
    const tall = baseHeight + roughness * (0.9 + random() * 0.6);
    for (let k = 0; k < 2; k++) heights[(at + k) % segments] = tall;
  }

  const positions: number[] = [];
  for (let i = 0; i < segments; i++) {
    const a0 = (i / segments) * Math.PI * 2;
    const a1 = ((i + 1) / segments) * Math.PI * 2;
    const h0 = heights[i];
    const h1 = heights[(i + 1) % segments];
    const p0: Vector3Tuple = [Math.cos(a0) * radius, -2, Math.sin(a0) * radius];
    const p1: Vector3Tuple = [Math.cos(a1) * radius, -2, Math.sin(a1) * radius];
    const q0: Vector3Tuple = [p0[0], h0, p0[2]];
    const q1: Vector3Tuple = [p1[0], h1, p1[2]];
    positions.push(...p0, ...q0, ...p1, ...p1, ...q0, ...q1);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  return geometry;
};

interface SkyAndHorizonProps {
  center: [number, number];
  mazeSize: number;
  atmosphere: Atmosphere;
  moonDirection: [number, number, number];
}

/** Gradient sky dome, twinkling stars, moon and layered horizon silhouettes. */
const SkyAndHorizon = ({ center, mazeSize, atmosphere, moonDirection }: SkyAndHorizonProps) => {
  const textures = getTextures();
  const starsRef = useRef<Points>(null);
  const near = mazeSize * 0.9 + 22;
  const far = near + 30;

  const resources = useMemo(() => {
    const sky = new ShaderMaterial({
      uniforms: {
        uZenith: { value: new Color(atmosphere.sky.zenith) },
        uHorizon: { value: new Color(atmosphere.sky.horizon) },
      },
      vertexShader: SKY_VERTEX,
      fragmentShader: SKY_FRAGMENT,
      side: BackSide,
      depthWrite: false,
      fog: false,
    });

    const random = createRandom(777);
    const count = 1400;
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const u = random() * Math.PI * 2;
      const v = Math.acos(1 - random() * 0.92);
      positions.set([Math.sin(v) * Math.cos(u) * 140, Math.cos(v) * 140, Math.sin(v) * Math.sin(u) * 140], i * 3);
      seeds[i] = random();
    }
    const starGeometry = new BufferGeometry();
    starGeometry.setAttribute('position', new BufferAttribute(positions, 3));
    starGeometry.setAttribute('aSeed', new BufferAttribute(seeds, 1));
    const stars = new ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uOpacity: { value: atmosphere.sky.stars } },
      vertexShader: STAR_VERTEX,
      fragmentShader: STAR_FRAGMENT,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    });

    const horizon = new Color(atmosphere.sky.horizon);
    const nearColor = new Color('#05060a').lerp(horizon, 0.15);
    const farColor = new Color('#05060a').lerp(horizon, 0.45);
    return {
      sky,
      starGeometry,
      stars,
      nearRing: silhouetteRing(near, 7, 9, 11),
      farRing: silhouetteRing(far, 12, 14, 23),
      nearMaterial: new MeshBasicMaterial({ color: nearColor, fog: false, side: DoubleSide }),
      farMaterial: new MeshBasicMaterial({ color: farColor, fog: false, side: DoubleSide }),
      moon: new MeshBasicMaterial({ color: new Color(2.2, 2.3, 2.6), toneMapped: false, fog: false }),
      moonGlow: new MeshBasicMaterial({
        map: textures.glow,
        color: new Color(atmosphere.moon.color).multiplyScalar(0.6),
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        fog: false,
      }),
    };
  }, [atmosphere, near, far, textures]);

  useFrame(({ clock }) => {
    setUniform(starsRef.current, 'uTime', clock.elapsedTime);
  });

  const moonDistance = 120;
  const moonPosition: Vector3Tuple = [
    center[0] + moonDirection[0] * moonDistance,
    moonDirection[1] * moonDistance,
    center[1] + moonDirection[2] * moonDistance,
  ];
  const showMoon = atmosphere.sky.stars > 0;

  return (
    <group name="sky">
      <mesh position={[center[0], 0, center[1]]} material={resources.sky} renderOrder={-10}>
        <sphereGeometry args={[150, 32, 16]} />
      </mesh>
      {atmosphere.sky.stars > 0 && (
        <points
          ref={starsRef}
          position={[center[0], 0, center[1]]}
          geometry={resources.starGeometry}
          material={resources.stars}
          renderOrder={-9}
        />
      )}
      {showMoon && (
        <group position={moonPosition}>
          <mesh material={resources.moon} onUpdate={(m) => m.lookAt(center[0], 0, center[1])}>
            <circleGeometry args={[4, 32]} />
          </mesh>
          <mesh material={resources.moonGlow} onUpdate={(m) => m.lookAt(center[0], 0, center[1])}>
            <planeGeometry args={[26, 26]} />
          </mesh>
        </group>
      )}
      <mesh position={[center[0], 0, center[1]]} geometry={resources.farRing} material={resources.farMaterial} />
      <mesh position={[center[0], 0, center[1]]} geometry={resources.nearRing} material={resources.nearMaterial} />
    </group>
  );
};

export default SkyAndHorizon;
