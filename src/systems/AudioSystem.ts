/**
 * Placeholder audio system. It keeps the public API used by the game and only
 * tracks settings; the procedural WebAudio implementation replaces it in T8.
 */
export class AudioSystem {
  private musicVolume = 0.3;
  private sfxVolume = 0.5;
  private musicEnabled = true;
  private sfxEnabled = true;

  public playBackgroundMusic(_track: string = 'medieval-theme'): void {
    if (!this.musicEnabled || this.musicVolume <= 0) return;
  }

  public stopBackgroundMusic(): void {}

  public playSoundEffect(_sound: string, volume?: number): void {
    if (!this.sfxEnabled) return;
    void (volume ?? this.sfxVolume);
  }

  public setMusicVolume(volume: number): void {
    this.musicVolume = Math.max(0, Math.min(1, volume));
  }

  public setSfxVolume(volume: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, volume));
  }

  public toggleMusic(): void {
    this.musicEnabled = !this.musicEnabled;
    if (!this.musicEnabled) {
      this.stopBackgroundMusic();
    }
  }

  public toggleSfx(): void {
    this.sfxEnabled = !this.sfxEnabled;
  }
}

export const audioSystem = new AudioSystem();
