import { describe, expect, it } from 'vitest';
import { AudioSystem } from './AudioSystem';

describe('AudioSystem without Web Audio support', () => {
  it('never throws and stays locked when no AudioContext can be created', () => {
    const audio = new AudioSystem(() => null);

    expect(() => {
      audio.unlock();
      audio.playBackgroundMusic();
      audio.setWeather('RAIN');
      audio.setDanger(0.8);
      audio.update(1 / 60);
      for (const sfx of ['step', 'wall-hit', 'awaken', 'victory', 'defeat', 'thunder', 'unknown']) {
        audio.playSoundEffect(sfx, 0.5);
      }
      audio.setEnabled(false);
      audio.setSfxVolume(2);
      audio.setMusicVolume(-1);
      audio.stopBackgroundMusic();
      audio.dispose();
    }).not.toThrow();
    expect(audio.unlocked).toBe(false);
  });

  it('survives a context factory that throws (audio blocked by policy)', () => {
    const audio = new AudioSystem(() => {
      throw new Error('blocked');
    });
    expect(() => audio.unlock()).not.toThrow();
    expect(audio.unlocked).toBe(false);
  });
});
