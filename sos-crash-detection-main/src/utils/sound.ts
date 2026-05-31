/**
 * Warning sound generator using the Web Audio API.
 * Creates a pulsating alarm tone without requiring external audio files.
 */

export class WarningSound {
  private audioContext: AudioContext | null = null;
  private oscillator: OscillatorNode | null = null;
  private gainNode: GainNode | null = null;
  private lfo: OscillatorNode | null = null;
  private lfoGain: GainNode | null = null;
  private isPlaying = false;

  private getContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new (
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      )();
    }
    return this.audioContext;
  }

  /** Start the alarm tone. Idempotent — calling twice is safe. */
  play(): void {
    if (this.isPlaying) return;

    try {
      const ctx = this.getContext();

      // Main oscillator — alarm tone
      this.oscillator = ctx.createOscillator();
      this.oscillator.type = 'sawtooth';
      this.oscillator.frequency.value = 880;

      // Gain for volume control
      this.gainNode = ctx.createGain();
      this.gainNode.gain.value = 0.25;

      // LFO for pulsing effect
      this.lfo = ctx.createOscillator();
      this.lfo.type = 'square';
      this.lfo.frequency.value = 2; // 2 Hz pulse

      this.lfoGain = ctx.createGain();
      this.lfoGain.gain.value = 0.25;

      // Wire up: oscillator → gain → destination
      //          lfo → lfoGain → gain.gain (modulation)
      this.lfo.connect(this.lfoGain);
      this.lfoGain.connect(this.gainNode.gain);
      this.oscillator.connect(this.gainNode);
      this.gainNode.connect(ctx.destination);

      // Alternate between two alarm frequencies
      const now = ctx.currentTime;
      for (let i = 0; i < 200; i++) {
        this.oscillator.frequency.setValueAtTime(880, now + i * 0.5);
        this.oscillator.frequency.setValueAtTime(660, now + i * 0.5 + 0.25);
      }

      this.oscillator.start();
      this.lfo.start();
      this.isPlaying = true;
    } catch (e) {
      console.warn('[WarningSound] Failed to play:', e);
    }
  }

  /** Stop the alarm tone. */
  stop(): void {
    if (!this.isPlaying) return;

    try {
      this.oscillator?.stop();
      this.oscillator?.disconnect();
      this.lfo?.stop();
      this.lfo?.disconnect();
      this.lfoGain?.disconnect();
      this.gainNode?.disconnect();
    } catch {
      // Nodes may already be stopped
    }

    this.oscillator = null;
    this.lfo = null;
    this.lfoGain = null;
    this.gainNode = null;
    this.isPlaying = false;
  }

  /** Release all audio resources. */
  dispose(): void {
    this.stop();
    if (this.audioContext) {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
  }
}

/** Trigger device vibration with a pattern (if supported). */
export function triggerVibration(
  pattern: number[] = [200, 100, 200, 100, 400],
): void {
  if ('vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      // Vibration not available
    }
  }
}

/** Cancel any ongoing vibration. */
export function stopVibration(): void {
  if ('vibrate' in navigator) {
    try {
      navigator.vibrate(0);
    } catch {
      // Ignore
    }
  }
}
