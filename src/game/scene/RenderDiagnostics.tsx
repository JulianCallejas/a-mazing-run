import { useFrame } from '@react-three/fiber';

export interface RenderDiagnostics {
  calls: number;
  triangles: number;
  geometries: number;
  textures: number;
  programs: number;
  pixelRatio: number;
  shadowMap: boolean;
}

declare global {
  interface Window {
    __mazeDiagnostics?: RenderDiagnostics;
    /** Debug-only (?debug): live engine for QA bots. Never set in normal play. */
    __mazeEngine?: unknown;
    /** Debug-only (?debug): audio system for QA. */
    __mazeAudio?: unknown;
  }
}

/**
 * Publishes renderer counters to `window.__mazeDiagnostics` for QA tooling.
 * Counters accumulate over a whole frame (shadow, scene and post passes):
 * auto-reset is disabled and the probe resets after reading (priority 2 runs
 * after PostFX at priority 1).
 */
const RenderDiagnosticsProbe = () => {
  useFrame(({ gl }) => {
    gl.info.autoReset = false;
    const { render, memory, programs } = gl.info;
    window.__mazeDiagnostics = {
      calls: render.calls,
      triangles: render.triangles,
      geometries: memory.geometries,
      textures: memory.textures,
      programs: programs?.length ?? 0,
      pixelRatio: gl.getPixelRatio(),
      shadowMap: gl.shadowMap.enabled,
    };
    gl.info.reset();
  }, 2);
  return null;
};

export default RenderDiagnosticsProbe;
