import { useEffect } from 'react';
import useGameStore from '../store/useGameStore';
import { audioSystem } from './AudioSystem';
import { diagnosticsEnabled } from '../game/scene/diagnostics';

/**
 * Connects the audio system to the app: unlocks Web Audio on the first user
 * gesture (browser autoplay policy) and mirrors settings from the store.
 */
const AudioBridge = () => {
  const soundEnabled = useGameStore((s) => s.soundEnabled);
  const soundVolume = useGameStore((s) => s.soundVolume);
  const musicVolume = useGameStore((s) => s.musicVolume);
  const visualEffect = useGameStore((s) => s.visualEffect);

  // QA hook, debug builds of the session only (?debug).
  useEffect(() => {
    if (!diagnosticsEnabled()) return;
    window.__mazeAudio = audioSystem;
    return () => {
      window.__mazeAudio = undefined;
    };
  }, []);

  useEffect(() => {
    const unlock = () => {
      audioSystem.unlock();
      audioSystem.playBackgroundMusic();
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  useEffect(() => audioSystem.setEnabled(soundEnabled), [soundEnabled]);
  useEffect(() => audioSystem.setSfxVolume(soundVolume), [soundVolume]);
  useEffect(() => audioSystem.setMusicVolume(musicVolume), [musicVolume]);
  useEffect(() => audioSystem.setWeather(visualEffect), [visualEffect]);

  return null;
};

export default AudioBridge;
