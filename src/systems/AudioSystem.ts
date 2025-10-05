export class AudioSystem {
  private backgroundMusic: HTMLAudioElement | null = null;
  private soundEffects: Map<string, HTMLAudioElement> = new Map();
  private musicVolume = 0.3;
  private sfxVolume = 0.5;
  private musicEnabled = true;
  private sfxEnabled = true;

  constructor() {
    this.initializeAudio();
  }

  private initializeAudio(): void {
    // Mock audio system - replace with actual audio files
    console.log('Audio system initialized');
  }

  public playBackgroundMusic(track: string = 'medieval-theme'): void {
    if (!this.musicEnabled) return;
    
    console.log(`Playing background music: ${track}`);
    // Mock implementation
  }

  public stopBackgroundMusic(): void {
    console.log('Stopping background music');
    // Mock implementation
  }

  public playSoundEffect(sound: string, volume?: number): void {
    if (!this.sfxEnabled) return;
    
    const actualVolume = volume ?? this.sfxVolume;
    console.log(`Playing sound effect: ${sound} at volume ${actualVolume}`);
    // Mock implementation
  }

  public setMusicVolume(volume: number): void {
    this.musicVolume = Math.max(0, Math.min(1, volume));
    console.log(`Music volume set to: ${this.musicVolume}`);
  }

  public setSfxVolume(volume: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, volume));
    console.log(`SFX volume set to: ${this.sfxVolume}`);
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

  public preloadSounds(sounds: string[]): void {
    console.log('Preloading sounds:', sounds);
    // Mock implementation
  }
}

export const audioSystem = new AudioSystem();