import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { CameraMode } from '../game/core/controls';
import type { Difficulty, VisualEffect } from '../game/core/scoring';

/**
 * App-level settings only. Per-frame game state lives in the engine
 * (src/game/core/engine.ts) so React never re-renders on every frame.
 */
export interface SettingsState {
  difficulty: Difficulty;
  visualEffect: VisualEffect;
  cameraMode: CameraMode;
  soundEnabled: boolean;
  musicEnabled: boolean;
  soundVolume: number;
  musicVolume: number;
}

interface SettingsActions {
  setDifficulty: (difficulty: Difficulty) => void;
  setVisualEffect: (effect: VisualEffect) => void;
  setCameraMode: (mode: CameraMode) => void;
  toggleCameraMode: () => void;
  toggleSound: () => void;
  toggleMusic: () => void;
  setSoundVolume: (volume: number) => void;
  setMusicVolume: (volume: number) => void;
}

export const initialSettings: SettingsState = {
  difficulty: 'MEDIUM',
  visualEffect: 'NONE',
  cameraMode: 'third-person',
  soundEnabled: true,
  musicEnabled: true,
  soundVolume: 0.7,
  musicVolume: 0.5,
};

const clampVolume = (volume: number) => Math.min(1, Math.max(0, volume));

const useGameStore = create<SettingsState & SettingsActions>()(
  devtools(
    (set) => ({
      ...initialSettings,
      setDifficulty: (difficulty) => set({ difficulty }, false, 'setDifficulty'),
      setVisualEffect: (visualEffect) => set({ visualEffect }, false, 'setVisualEffect'),
      setCameraMode: (cameraMode) => set({ cameraMode }, false, 'setCameraMode'),
      toggleCameraMode: () =>
        set(
          (s) => ({ cameraMode: s.cameraMode === 'third-person' ? 'aerial' : 'third-person' }),
          false,
          'toggleCameraMode',
        ),
      toggleSound: () => set((s) => ({ soundEnabled: !s.soundEnabled }), false, 'toggleSound'),
      toggleMusic: () => set((s) => ({ musicEnabled: !s.musicEnabled }), false, 'toggleMusic'),
      setSoundVolume: (v) => set({ soundVolume: clampVolume(v) }, false, 'setSoundVolume'),
      setMusicVolume: (v) => set({ musicVolume: clampVolume(v) }, false, 'setMusicVolume'),
    }),
    { name: 'a-mazing-run', enabled: import.meta.env.DEV },
  ),
);

export default useGameStore;
