import type { VisualEffect } from '../game/core/scoring';
import { heartbeatInterval, noteFrequency, weatherMix } from './audioMath';

/**
 * Procedural Web Audio: every sound is synthesized at runtime (no audio
 * files). A medieval ambience bed (filtered drone, wind/rain noise, distant
 * bells), event SFX and a danger heartbeat.
 *
 * Browsers only allow audio after a user gesture, so nothing is created until
 * `unlock()` runs from one. Every method is a safe no-op when Web Audio is
 * unavailable or blocked.
 */

type ContextFactory = () => AudioContext | null;

const browserContextFactory: ContextFactory = () => {
  if (typeof window === 'undefined') return null;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  return Ctor ? new Ctor() : null;
};

interface Graph {
  ctx: AudioContext;
  master: GainNode;
  music: GainNode;
  sfx: GainNode;
  reverb: ConvolverNode;
  noise: AudioBuffer;
}

interface Ambience {
  stop: (at: number) => void;
  droneGain: GainNode;
  noiseGain: GainNode;
  highpass: BiquadFilterNode;
  lowpass: BiquadFilterNode;
}

const SILENT = 0.0001;
/** D Dorian bell notes, as semitones from A4. */
const BELL_NOTES = [5, 7, 8, 12, 15];

export class AudioSystem {
  private graph: Graph | null = null;
  private ambience: Ambience | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private enabled = true;
  private musicVolume = 0.5;
  private sfxVolume = 0.7;
  private musicWanted = false;
  private weather: VisualEffect = 'NONE';
  private danger = 0;
  private nextBeat = 0;
  private nextBell = 0;

  constructor(private readonly createContext: ContextFactory = browserContextFactory) {}

  get unlocked(): boolean {
    return this.graph !== null && this.graph.ctx.state === 'running';
  }

  /** Call from a user gesture. Creates the audio graph on first call. */
  unlock(): void {
    if (this.graph) {
      void this.graph.ctx.resume().catch(() => undefined);
      return;
    }
    let ctx: AudioContext | null;
    try {
      ctx = this.createContext();
    } catch {
      ctx = null;
    }
    if (!ctx) return;
    this.graph = this.buildGraph(ctx);
    void ctx.resume().catch(() => undefined);
    if (this.musicWanted) this.startAmbience();
    this.timer = setInterval(() => this.update(0.1), 100);
  }

  /** Stops timers and releases the audio context. */
  dispose(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.ambience = null;
    void this.graph?.ctx.close().catch(() => undefined);
    this.graph = null;
  }

  playBackgroundMusic(): void {
    this.musicWanted = true;
    this.startAmbience();
  }

  stopBackgroundMusic(): void {
    this.musicWanted = false;
    if (!this.graph || !this.ambience) return;
    this.ambience.stop(this.graph.ctx.currentTime);
    this.ambience = null;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!this.graph) return;
    const { ctx, master } = this.graph;
    master.gain.setTargetAtTime(enabled ? 1 : 0, ctx.currentTime, 0.05);
  }

  setMusicVolume(volume: number): void {
    this.musicVolume = Math.max(0, Math.min(1, volume));
    if (this.graph) this.graph.music.gain.setTargetAtTime(this.musicVolume, this.graph.ctx.currentTime, 0.1);
  }

  setSfxVolume(volume: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, volume));
    if (this.graph) this.graph.sfx.gain.setTargetAtTime(this.sfxVolume, this.graph.ctx.currentTime, 0.1);
  }

  setWeather(effect: VisualEffect): void {
    this.weather = effect;
    if (!this.graph || !this.ambience) return;
    const mix = weatherMix(effect);
    const t = this.graph.ctx.currentTime;
    this.ambience.droneGain.gain.setTargetAtTime(mix.drone * 0.12, t, 1.2);
    this.ambience.noiseGain.gain.setTargetAtTime(mix.noise * 0.28, t, 1.2);
    this.ambience.highpass.frequency.setTargetAtTime(mix.noiseHighpass, t, 1.2);
    this.ambience.lowpass.frequency.setTargetAtTime(mix.noiseLowpass, t, 1.2);
  }

  /** 0..1 proximity of the nearest awake guardian; drives the heartbeat. */
  setDanger(danger: number): void {
    this.danger = Math.max(0, Math.min(1, Number.isFinite(danger) ? danger : 0));
  }

  /** Schedules time-based sounds (heartbeat, bells). Runs on an internal timer. */
  update(_dt: number): void {
    if (!this.graph || !this.enabled) return;
    const now = this.graph.ctx.currentTime;
    const interval = heartbeatInterval(this.danger);
    if (interval !== null && now >= this.nextBeat) {
      this.heartbeat(now + 0.02, this.danger);
      this.nextBeat = now + interval;
    }
    if (this.ambience && now >= this.nextBell) {
      if (this.nextBell > 0) this.bell(now + 0.05);
      this.nextBell = now + 7 + Math.random() * 9;
    }
  }

  playSoundEffect(sound: string, volume = 1): void {
    if (!this.graph || !this.enabled) return;
    const t = this.graph.ctx.currentTime + 0.005;
    switch (sound) {
      case 'step':
        this.noiseBurst(t, 'bandpass', 500 + Math.random() * 450, 1.3, 0.32 * volume, 0.004, 0.08);
        this.tone(t, 'sine', 95 + Math.random() * 20, 0.002, 0.06, 0.12 * volume);
        break;
      case 'wall-hit':
        this.sweep(t, 'sine', 130, 50, 0.14, 0.6 * volume);
        this.noiseBurst(t, 'lowpass', 500, 0.7, 0.35 * volume, 0.002, 0.09);
        break;
      case 'awaken': {
        const voices = [-31, -24, -19].map(noteFrequency); // D2, A2, D3
        for (const f of voices) this.brass(t, f, 2.4, 0.16 * volume);
        this.noiseBurst(t + 0.05, 'highpass', 2800, 0.8, 0.18 * volume, 0.002, 0.35, true);
        break;
      }
      case 'victory':
        [-7, -3, 0, 5].forEach((semi, i) => {
          this.tone(t + i * 0.13, 'triangle', noteFrequency(semi), 0.01, 1.3, 0.22 * volume, true);
          this.tone(t + i * 0.13, 'sine', noteFrequency(semi + 12), 0.01, 0.9, 0.06 * volume, true);
        });
        break;
      case 'defeat':
        [0, -4, -7].forEach((semi, i) => {
          this.brass(t + i * 0.28, noteFrequency(semi - 12), 1.6, 0.16 * volume);
        });
        this.noiseBurst(t, 'lowpass', 140, 0.8, 0.4 * volume, 0.2, 2.2);
        break;
      case 'treasure':
        [7, 12, 16, 19].forEach((semi, i) => {
          this.tone(t + i * 0.07, 'triangle', noteFrequency(semi), 0.005, 0.7, 0.16 * volume, true);
          this.tone(t + i * 0.07, 'sine', noteFrequency(semi + 12), 0.005, 0.5, 0.05 * volume, true);
        });
        break;
      case 'treasure-near':
        // A faint, high glint; the caller scales `volume` with proximity.
        this.tone(t, 'sine', noteFrequency(24), 0.004, 0.35, 0.07 * volume, true);
        this.tone(t + 0.09, 'sine', noteFrequency(31), 0.004, 0.3, 0.04 * volume, true);
        break;
      case 'thunder':
        this.noiseBurst(t, 'highpass', 1800, 0.6, 0.2 * volume, 0.002, 0.12);
        this.noiseBurst(t + 0.08, 'lowpass', 160, 0.9, 0.9 * volume, 0.08, 2.8, true);
        break;
      default:
        break;
    }
  }

  // --- Graph ---------------------------------------------------------------

  private buildGraph(ctx: AudioContext): Graph {
    const master = ctx.createGain();
    master.gain.value = this.enabled ? 1 : 0;
    master.connect(ctx.destination);
    const music = ctx.createGain();
    music.gain.value = this.musicVolume;
    music.connect(master);
    const sfx = ctx.createGain();
    sfx.gain.value = this.sfxVolume;
    sfx.connect(master);

    // Stone-hall reverb from a generated decaying-noise impulse.
    const reverb = ctx.createConvolver();
    const length = Math.floor(ctx.sampleRate * 2.6);
    const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
    for (let channel = 0; channel < 2; channel++) {
      const data = impulse.getChannelData(channel);
      for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 3;
    }
    reverb.buffer = impulse;
    const wet = ctx.createGain();
    wet.gain.value = 0.35;
    reverb.connect(wet);
    wet.connect(master);

    const noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const samples = noise.getChannelData(0);
    for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;

    return { ctx, master, music, sfx, reverb, noise };
  }

  private startAmbience(): void {
    if (!this.graph || this.ambience) return;
    const { ctx, music, noise } = this.graph;
    const t = ctx.currentTime;
    const mix = weatherMix(this.weather);

    const droneGain = ctx.createGain();
    droneGain.gain.setValueAtTime(SILENT, t);
    droneGain.gain.setTargetAtTime(mix.drone * 0.12, t, 2);
    const droneFilter = ctx.createBiquadFilter();
    droneFilter.type = 'lowpass';
    droneFilter.frequency.value = 280;
    droneFilter.Q.value = 2;
    droneFilter.connect(droneGain);
    droneGain.connect(music);

    const oscillators: AudioScheduledSourceNode[] = [];
    for (const [type, freq, detune] of [
      ['sawtooth', noteFrequency(-31), -7],
      ['sawtooth', noteFrequency(-31), 7],
      ['sine', noteFrequency(-36), 0],
    ] as const) {
      const osc = ctx.createOscillator();
      osc.type = type;
      osc.frequency.value = freq;
      osc.detune.value = detune;
      osc.connect(droneFilter);
      osc.start(t);
      oscillators.push(osc);
    }
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoDepth = ctx.createGain();
    lfoDepth.gain.value = 120;
    lfo.connect(lfoDepth);
    lfoDepth.connect(droneFilter.frequency);
    lfo.start(t);
    oscillators.push(lfo);

    const source = ctx.createBufferSource();
    source.buffer = noise;
    source.loop = true;
    const highpass = ctx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = mix.noiseHighpass;
    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = mix.noiseLowpass;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(SILENT, t);
    noiseGain.gain.setTargetAtTime(mix.noise * 0.28, t, 2);
    source.connect(highpass).connect(lowpass).connect(noiseGain).connect(music);
    // Gusts: slow modulation of the noise level.
    const gust = ctx.createOscillator();
    gust.frequency.value = 0.13;
    const gustDepth = ctx.createGain();
    gustDepth.gain.value = mix.noise * 0.08;
    gust.connect(gustDepth).connect(noiseGain.gain);
    source.start(t);
    gust.start(t);
    oscillators.push(source, gust);

    this.ambience = {
      droneGain,
      noiseGain,
      highpass,
      lowpass,
      stop: (at) => {
        droneGain.gain.setTargetAtTime(SILENT, at, 0.4);
        noiseGain.gain.setTargetAtTime(SILENT, at, 0.4);
        for (const node of oscillators) node.stop(at + 2);
      },
    };
    this.nextBell = 0;
  }

  // --- Voices --------------------------------------------------------------

  private out(reverb: boolean): AudioNode {
    const graph = this.graph!;
    if (!reverb) return graph.sfx;
    const split = graph.ctx.createGain();
    split.connect(graph.sfx);
    split.connect(graph.reverb);
    return split;
  }

  private envelope(gain: AudioParam, t: number, attack: number, decay: number, peak: number): void {
    gain.setValueAtTime(SILENT, t);
    gain.linearRampToValueAtTime(Math.max(SILENT, peak), t + attack);
    gain.exponentialRampToValueAtTime(SILENT, t + attack + decay);
  }

  private tone(t: number, type: OscillatorType, freq: number, attack: number, decay: number, peak: number, reverb = false) {
    const { ctx } = this.graph!;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    const gain = ctx.createGain();
    this.envelope(gain.gain, t, attack, decay, peak);
    osc.connect(gain).connect(this.out(reverb));
    osc.start(t);
    osc.stop(t + attack + decay + 0.05);
  }

  private sweep(t: number, type: OscillatorType, from: number, to: number, decay: number, peak: number) {
    const { ctx } = this.graph!;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(from, t);
    osc.frequency.exponentialRampToValueAtTime(to, t + decay);
    const gain = ctx.createGain();
    this.envelope(gain.gain, t, 0.003, decay, peak);
    osc.connect(gain).connect(this.out(false));
    osc.start(t);
    osc.stop(t + decay + 0.05);
  }

  /** Sawtooth through a sweeping low-pass: horn-like swell. */
  private brass(t: number, freq: number, decay: number, peak: number) {
    const { ctx } = this.graph!;
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = freq;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(180, t);
    filter.frequency.exponentialRampToValueAtTime(1600, t + 0.6);
    filter.frequency.exponentialRampToValueAtTime(300, t + decay);
    const gain = ctx.createGain();
    this.envelope(gain.gain, t, 0.25, decay, peak);
    osc.connect(filter).connect(gain).connect(this.out(true));
    osc.start(t);
    osc.stop(t + decay + 0.3);
  }

  private noiseBurst(
    t: number,
    type: BiquadFilterType,
    freq: number,
    q: number,
    peak: number,
    attack: number,
    decay: number,
    reverb = false,
  ) {
    const { ctx, noise } = this.graph!;
    const source = ctx.createBufferSource();
    source.buffer = noise;
    source.playbackRate.value = 0.8 + Math.random() * 0.4;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = freq;
    filter.Q.value = q;
    const gain = ctx.createGain();
    this.envelope(gain.gain, t, attack, decay, peak);
    source.connect(filter).connect(gain).connect(this.out(reverb));
    source.start(t, Math.random());
    source.stop(t + attack + decay + 0.05);
  }

  private heartbeat(t: number, danger: number) {
    const peak = 0.25 + danger * 0.45;
    this.sweep(t, 'sine', 70, 42, 0.13, peak);
    this.sweep(t + 0.17, 'sine', 62, 40, 0.11, peak * 0.7);
  }

  private bell(t: number) {
    const base = noteFrequency(BELL_NOTES[Math.floor(Math.random() * BELL_NOTES.length)]);
    for (const [ratio, level] of [
      [1, 0.05],
      [2.76, 0.022],
      [5.4, 0.01],
    ] as const) {
      this.tone(t, 'sine', base * ratio, 0.005, 3.8 / ratio + 0.6, level, true);
    }
  }
}

export const audioSystem = new AudioSystem();
