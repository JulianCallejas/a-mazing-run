import { useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { HalfFloatType, Vector2, WebGLRenderTarget } from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { QUALITY } from '../../art/quality';

const VignetteShader = {
  uniforms: { tDiffuse: { value: null }, uStrength: { value: 0.55 }, uSize: { value: 0.78 } },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uStrength;
    uniform float uSize;
    varying vec2 vUv;
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      float d = distance(vUv, vec2(0.5));
      c.rgb *= mix(1.0, smoothstep(uSize, uSize - 0.45, d), uStrength);
      gl_FragColor = c;
    }
  `,
};

/**
 * Bloom blurs across the whole frame, so a single NaN/Infinity pixel from any shader
 * would black out large areas. Comparisons with NaN are false, so those become 0.
 */
const SanitizeShader = {
  uniforms: { tDiffuse: { value: null } },
  vertexShader: VignetteShader.vertexShader,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    varying vec2 vUv;
    float clean(float v) { return v >= 0.0 ? min(v, 64.0) : 0.0; }
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      gl_FragColor = vec4(clean(c.r), clean(c.g), clean(c.b), clean(c.a));
    }
  `,
};

/**
 * Finishing pass: HDR render (MSAA) -> bloom on authored emissives only
 * (threshold 0.9) -> subtle vignette -> tone mapping/sRGB output.
 * Priority 1 makes this component own the frame's render call.
 */
const PostFX = () => {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const dpr = useThree((s) => s.viewport.dpr);

  const composer = useMemo(() => {
    const target = new WebGLRenderTarget(1, 1, { type: HalfFloatType, samples: 4 });
    const fx = new EffectComposer(gl, target);
    fx.addPass(new RenderPass(scene, camera));
    // Mobile tier skips bloom to stay inside its draw-call budget.
    if (QUALITY.bloom) {
      fx.addPass(new ShaderPass(SanitizeShader));
      fx.addPass(new UnrealBloomPass(new Vector2(256, 256), 0.6, 0.45, 0.9));
    }
    fx.addPass(new ShaderPass(VignetteShader));
    fx.addPass(new OutputPass());
    return fx;
  }, [gl, scene, camera]);

  useEffect(() => {
    composer.setPixelRatio(dpr);
    composer.setSize(size.width, size.height);
  }, [composer, size, dpr]);

  useEffect(() => () => composer.dispose(), [composer]);

  useFrame((_, delta) => composer.render(delta), 1);
  return null;
};

export default PostFX;
