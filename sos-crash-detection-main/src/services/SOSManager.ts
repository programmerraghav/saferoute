/**
 * SOSManager
 *
 * Manages the confirmation countdown and SOS trigger flow:
 *  1. Receives a CrashEvent from CrashDetectionService
 *  2. Starts a visible countdown timer
 *  3. On timeout → triggers SOS via ApiService
 *  4. On user cancel → aborts everything
 *  5. On user confirm → immediately triggers SOS
 *
 * Also handles warning sound and device vibration.
 */

import type { CrashEvent, SOSResponse, CrashDetectionConfig } from '../types';
import { apiService } from './ApiService';
import { WarningSound, triggerVibration, stopVibration } from '../utils/sound';

export interface SOSManagerCallbacks {
  onCountdownTick: (secondsLeft: number) => void;
  onSOSTriggered: (response: SOSResponse) => void;
  onSOSCancelled: () => void;
  onLog: (message: string) => void;
}

export class SOSManager {
  private readonly config: CrashDetectionConfig;
  private readonly callbacks: SOSManagerCallbacks;
  private readonly warningSound: WarningSound;

  private countdownTimer: ReturnType<typeof setInterval> | null = null;
  private secondsLeft = 0;
  private currentEvent: CrashEvent | null = null;
  private alertId: string | null = null;
  private isSending = false;

  constructor(config: CrashDetectionConfig, callbacks: SOSManagerCallbacks) {
    this.config = config;
    this.callbacks = callbacks;
    this.warningSound = new WarningSound();
  }

  /* ---------------------------------------------------------------- */
  /*  Public API                                                       */
  /* ---------------------------------------------------------------- */

  /**
   * Begin the confirmation countdown for a detected crash.
   * Shows the emergency modal with timer, sound, and vibration.
   */
  startCountdown(event: CrashEvent): void {
    this.currentEvent = event;
    this.secondsLeft = this.config.COUNTDOWN_DURATION;
    this.isSending = false;

    this.callbacks.onLog(`Countdown started: ${this.secondsLeft}s`);
    this.callbacks.onCountdownTick(this.secondsLeft);

    // Start warning sound and vibration
    this.warningSound.play();
    this.pulseVibration();

    // Tick every second
    this.clearCountdown();
    this.countdownTimer = setInterval(() => {
      this.secondsLeft -= 1;
      this.callbacks.onCountdownTick(this.secondsLeft);
      this.callbacks.onLog(`Countdown: ${this.secondsLeft}s remaining`);

      // Pulse vibration on each tick
      this.pulseVibration();

      if (this.secondsLeft <= 0) {
        this.clearCountdown();
        this.triggerSOS();
      }
    }, 1000);
  }

  /**
   * User pressed "I'm Safe" — abort everything.
   */
  async cancel(): Promise<void> {
    this.callbacks.onLog('User cancelled — "I\'m Safe"');
    this.clearCountdown();
    this.warningSound.stop();
    stopVibration();

    // If SOS was already sent, try to cancel it
    if (this.alertId) {
      await apiService.cancelSOS(this.alertId);
    }

    this.currentEvent = null;
    this.alertId = null;
    this.callbacks.onSOSCancelled();
  }

  /**
   * User pressed "Send Help Now" — immediately trigger SOS.
   */
  async sendImmediately(): Promise<void> {
    this.callbacks.onLog('User pressed "Send Help Now" — immediate SOS');
    this.clearCountdown();
    await this.triggerSOS();
  }

  /** Clean up all resources. */
  dispose(): void {
    this.clearCountdown();
    this.warningSound.dispose();
    stopVibration();
  }

  /* ---------------------------------------------------------------- */
  /*  Internal                                                         */
  /* ---------------------------------------------------------------- */

  private async triggerSOS(): Promise<void> {
    if (this.isSending || !this.currentEvent) return;
    this.isSending = true;

    this.warningSound.stop();
    stopVibration();

    this.callbacks.onLog('🚨 SENDING SOS ALERT...');
    console.error('[SOSManager] 🚨 SOS TRIGGERED', this.currentEvent);

    const response = await apiService.sendSOS(this.currentEvent);

    if (response.alertId) {
      this.alertId = response.alertId;
    }

    this.callbacks.onLog(
      response.success
        ? `SOS sent successfully. Alert ID: ${response.alertId}`
        : `SOS send failed: ${response.message}`,
    );

    this.callbacks.onSOSTriggered(response);
  }

  private clearCountdown(): void {
    if (this.countdownTimer !== null) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
  }

  private pulseVibration(): void {
    triggerVibration([150, 50, 150]);
  }
}
