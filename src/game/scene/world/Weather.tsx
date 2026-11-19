import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  NormalBlending,
  ShaderMaterial,
  type LineSegments,
  type Points,
} from 'three';
import { createRandom } from '../../core/random';
import { setUniform } from './uniforms';

/**
 * GPU weather: particles live in a box that wraps around the player inside
 * the vertex shader, so the field looks infinite with a fixed buffer and zero
 * per-frame CPU work beyond two uniforms.
 */

const BOX = 22;
const HEIGHT = 9;

const WRAP = /* glsl */ `
  uniform float uTime;
  uniform vec3 uCenter;
  vec3 wrapAround(vec3 p) {
    vec2 rel = mod(p.xz - uCenter.xz + ${(BOX / 2).toFixed(1)}, ${BOX.toFixed(1)}) - ${(BOX / 2).toFixed(1)};
    return vec3(uCenter.x + rel.x, p.y, uCenter.z + rel.y);
  }
`;

const SNOW_VERTEX = /* glsl */ `
  ${WRAP}
  uniform float uScale;
  attribute float aSeed;
  varying float vAlpha;
  void main() {
    vec3 p = position;
    p.y = mod(p.y - uTime * (0.55 + aSeed * 0.4), ${HEIGHT.toFixed(1)});
    p.x += sin(uTime * 0.8 + aSeed * 31.0) * 0.35;
    p.z += cos(uTime * 0.6 + aSeed * 17.0) * 0.35;
    p.x += uTime * 0.25;
    p = wrapAround(p);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vAlpha = smoothstep(0.0, 0.6, p.y) * smoothstep(${HEIGHT.toFixed(1)}, ${(HEIGHT - 2).toFixed(1)}, p.y);
    gl_PointSize = min((0.035 + aSeed * 0.03) * projectionMatrix[1][1] * uScale / -mv.z, 7.0);
    gl_Position = projectionMatrix * mv;
  }
`;

const SNOW_FRAGMENT = /* glsl */ `
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.1, d) * vAlpha * 0.9;
    gl_FragColor = vec4(vec3(0.95, 0.97, 1.0), a);
  }
`;

const RAIN_VERTEX = /* glsl */ `
  ${WRAP}
  attribute float aSeed;
  attribute float aTail;
  varying float vAlpha;
  void main() {
    vec3 p = position;
    float speed = 11.0 + aSeed * 5.0;
    p.y = mod(p.y - uTime * speed, ${HEIGHT.toFixed(1)});
    p.x += uTime * 1.2;
    p = wrapAround(p);
    p += vec3(-0.06, 0.45, 0.0) * aTail;
    vAlpha = (1.0 - aTail * 0.85) * smoothstep(0.0, 0.5, p.y);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const RAIN_FRAGMENT = /* glsl */ `
  varying float vAlpha;
  void main() {
    gl_FragColor = vec4(vec3(0.55, 0.65, 0.8) * vAlpha * 0.32, vAlpha * 0.32);
  }
`;

const buildField = (count: number, seed: number, segments: boolean) => {
  const random = createRandom(seed);
  const vertices = segments ? count * 2 : count;
  const positions = new Float32Array(vertices * 3);
  const seeds = new Float32Array(vertices);
  const tails = new Float32Array(vertices);
  for (let i = 0; i < count; i++) {
    const x = random() * BOX;
    const y = random() * HEIGHT;
    const z = random() * BOX;
    const s = random();
    const copies = segments ? 2 : 1;
    for (let k = 0; k < copies; k++) {
      const v = i * copies + k;
      positions.set([x, y, z], v * 3);
      seeds[v] = s;
      tails[v] = k;
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  geometry.setAttribute('aSeed', new BufferAttribute(seeds, 1));
  geometry.setAttribute('aTail', new BufferAttribute(tails, 1));
  return geometry;
};

interface WeatherProps {
  kind: 'none' | 'snow' | 'rain';
  /** Point the particle field wraps around. */
  focus: { x: number; z: number };
}

const Weather = ({ kind, focus }: WeatherProps) => {
  const drawingHeight = useThree((s) => s.size.height);
  const pointsRef = useRef<Points>(null);
  const linesRef = useRef<LineSegments>(null);

  const resources = useMemo(() => {
    if (kind === 'snow') {
      return {
        geometry: buildField(2600, 5, false),
        material: new ShaderMaterial({
          uniforms: { uTime: { value: 0 }, uCenter: { value: [0, 0, 0] }, uScale: { value: 400 } },
          vertexShader: SNOW_VERTEX,
          fragmentShader: SNOW_FRAGMENT,
          transparent: true,
          depthWrite: false,
          blending: NormalBlending,
        }),
      };
    }
    if (kind === 'rain') {
      return {
        geometry: buildField(2400, 9, true),
        material: new ShaderMaterial({
          uniforms: { uTime: { value: 0 }, uCenter: { value: [0, 0, 0] } },
          vertexShader: RAIN_VERTEX,
          fragmentShader: RAIN_FRAGMENT,
          transparent: true,
          depthWrite: false,
          blending: AdditiveBlending,
        }),
      };
    }
    return null;
  }, [kind]);

  useFrame(({ clock }) => {
    const field = pointsRef.current ?? linesRef.current;
    setUniform(field, 'uTime', clock.elapsedTime);
    setUniform(field, 'uCenter', [focus.x, 0, focus.z]);
    setUniform(field, 'uScale', drawingHeight / 2);
  });

  if (!resources) return null;
  return kind === 'rain' ? (
    <lineSegments ref={linesRef} geometry={resources.geometry} material={resources.material} frustumCulled={false} />
  ) : (
    <points ref={pointsRef} geometry={resources.geometry} material={resources.material} frustumCulled={false} />
  );
};

export default Weather;
