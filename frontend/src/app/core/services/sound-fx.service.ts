import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SoundFxService {
  private audioCtx: AudioContext | null = null;
  private soundEnabled: boolean = true;
  private lastPlayTime: number = 0;
  private readonly DEBOUNCE_MS = 140;

  constructor() {
    const saved = localStorage.getItem('portfoliopro_sound_enabled');
    if (saved !== null) {
      this.soundEnabled = saved === 'true';
    } else {
      this.soundEnabled = true;
    }

    // Auto-resume audio context on first user interaction anywhere
    if (typeof window !== 'undefined') {
      const resumeHandler = () => {
        this.ensureContext();
        if (this.audioCtx && this.audioCtx.state === 'suspended') {
          this.audioCtx.resume().catch(() => {});
        }
      };

      window.addEventListener('pointerdown', resumeHandler, { once: true, passive: true });
      window.addEventListener('keydown', resumeHandler, { once: true, passive: true });
      window.addEventListener('click', resumeHandler, { once: true, passive: true });
    }
  }

  public isEnabled(): boolean {
    return this.soundEnabled;
  }

  public toggleSound(): boolean {
    this.soundEnabled = !this.soundEnabled;
    localStorage.setItem('portfoliopro_sound_enabled', String(this.soundEnabled));
    if (this.soundEnabled) {
      this.playSwoosh();
    }
    return this.soundEnabled;
  }

  public setSoundEnabled(enabled: boolean): void {
    this.soundEnabled = enabled;
    localStorage.setItem('portfoliopro_sound_enabled', String(enabled));
  }

  private ensureContext(): AudioContext | null {
    if (!this.audioCtx && typeof window !== 'undefined') {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
      }
    }
    return this.audioCtx;
  }

  /**
   * Synthesizes an organic, slow, velvety wind "SWOOSH" sound effect
   * using shaped pink noise, biquad filter sweeps, and low-end air resonance.
   */
  public playSwoosh(): void {
    if (!this.soundEnabled || typeof window === 'undefined') return;

    const nowTime = Date.now();
    if (nowTime - this.lastPlayTime < this.DEBOUNCE_MS) return;
    this.lastPlayTime = nowTime;

    const ctx = this.ensureContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    try {
      const duration = 0.52; // slow, luxurious 520ms transition duration
      const now = ctx.currentTime;

      // 1. Noise Generator (Pink Noise approximation for warm organic wind sound)
      const bufferSize = Math.floor(ctx.sampleRate * duration);
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99765 * b0 + white * 0.0990460;
        b1 = 0.96300 * b1 + white * 0.1600000;
        b2 = 0.57000 * b2 + white * 0.3500000;
        data[i] = (b0 + b1 + b2 + white * 0.05) * 0.18; // smooth airy pink noise
      }

      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = noiseBuffer;

      // 2. Resonant Bandpass Filter for the Wind Sweep
      const windFilter = ctx.createBiquadFilter();
      windFilter.type = 'bandpass';
      windFilter.Q.setValueAtTime(2.2, now);
      // Frequency rises gently like a breeze, then dissipates smoothly
      windFilter.frequency.setValueAtTime(220, now);
      windFilter.frequency.exponentialRampToValueAtTime(880, now + 0.18);
      windFilter.frequency.exponentialRampToValueAtTime(160, now + duration);

      // 3. Low-pass air cushion filter (cuts harsh highs for a velvety acoustic finish)
      const lowpass = ctx.createBiquadFilter();
      lowpass.type = 'lowpass';
      lowpass.frequency.setValueAtTime(2400, now);

      // 4. Subtle Sub-Bass harmonic oscillator for tactile weight
      const subOsc = ctx.createOscillator();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(65, now);
      subOsc.frequency.exponentialRampToValueAtTime(130, now + 0.16);
      subOsc.frequency.exponentialRampToValueAtTime(45, now + duration);

      const subGain = ctx.createGain();
      subGain.gain.setValueAtTime(0.0001, now);
      subGain.gain.linearRampToValueAtTime(0.045, now + 0.12);
      subGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      subOsc.connect(subGain);

      // 5. Main Wind Amplitude Envelope
      const windGain = ctx.createGain();
      windGain.gain.setValueAtTime(0.0001, now);
      windGain.gain.linearRampToValueAtTime(0.16, now + 0.14); // silky attack
      windGain.gain.exponentialRampToValueAtTime(0.0001, now + duration); // smooth wind tail

      // 6. Stereo Panning (left to right air drift)
      let finalNode: AudioNode = windGain;
      if (typeof ctx.createStereoPanner === 'function') {
        const panner = ctx.createStereoPanner();
        panner.pan.setValueAtTime(-0.25, now);
        panner.pan.linearRampToValueAtTime(0.25, now + duration);
        windGain.connect(panner);
        subGain.connect(panner);
        finalNode = panner;
      } else {
        subGain.connect(ctx.destination);
      }

      // Connect noise pipeline
      noiseSource.connect(windFilter);
      windFilter.connect(lowpass);
      lowpass.connect(windGain);

      // Connect to master output
      finalNode.connect(ctx.destination);

      // Trigger playback
      noiseSource.start(now);
      subOsc.start(now);
      noiseSource.stop(now + duration);
      subOsc.stop(now + duration);
    } catch {
      // Audio context might be restricted before initial gesture
    }
  }
}
