/**
 * ApiService — Backend Integration Layer
 *
 * Clean abstraction over the SOS API. All endpoints are configured
 * via environment variables so the frontend can be pointed at any
 * backend without code changes.
 *
 * TODO: Connect to your actual backend. The current implementation
 *       logs the payload and returns a mock success response.
 */

import type { SOSPayload, SOSResponse, CrashEvent } from '../types';
import { API_CONFIG } from '../config';

export class ApiService {
  private readonly baseUrl: string;
  private readonly timeout: number;

  constructor() {
    this.baseUrl = API_CONFIG.BASE_URL;
    this.timeout = API_CONFIG.TIMEOUT;
  }

  /**
   * Send an SOS alert to the backend.
   *
   * POST /api/sos
   *
   * TODO: Remove the mock response once the backend is live.
   */
  async sendSOS(event: CrashEvent): Promise<SOSResponse> {
    const payload = this.buildPayload(event);
    const url = `${this.baseUrl}${API_CONFIG.SOS_ENDPOINT}`;

    console.log('[ApiService] Sending SOS to', url);
    console.log('[ApiService] Payload:', JSON.stringify(payload, null, 2));

    try {
      // TODO: Uncomment when backend is ready
      // const response = await this.post<SOSResponse>(url, payload);
      // return response;

      // ── Mock response (remove when backend is connected) ──
      await this.simulateNetworkDelay(800);
      const mockResponse: SOSResponse = {
        success: true,
        alertId: `ALERT-${Date.now()}`,
        message: 'SOS alert received. Emergency services notified.',
        estimatedResponseTime: 300, // 5 minutes
      };
      console.log('[ApiService] Mock response:', mockResponse);
      return mockResponse;
      // ── End mock ──
    } catch (error) {
      console.error('[ApiService] Failed to send SOS:', error);
      // Even if the API fails, return a response so the UI can react
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : 'Failed to send SOS alert. Please call emergency services directly.',
      };
    }
  }

  /**
   * Cancel a previously sent SOS (if the user confirms they're safe).
   *
   * POST /api/sos/cancel
   *
   * TODO: Implement when backend supports cancellation.
   */
  async cancelSOS(alertId: string): Promise<{ success: boolean }> {
    const url = `${this.baseUrl}${API_CONFIG.SOS_ENDPOINT}/cancel`;

    console.log('[ApiService] Cancelling SOS:', alertId);

    try {
      // TODO: Uncomment when backend is ready
      // return await this.post(url, { alertId });

      await this.simulateNetworkDelay(300);
      return { success: true };
    } catch (error) {
      console.error('[ApiService] Failed to cancel SOS:', error);
      return { success: false };
    }
  }

  /* ---------------------------------------------------------------- */
  /*  Internal helpers                                                 */
  /* ---------------------------------------------------------------- */

  private buildPayload(event: CrashEvent): SOSPayload {
    return {
      userId: API_CONFIG.USER_ID,
      timestamp: new Date(event.timestamp).toISOString(),
      latitude: event.location.latitude,
      longitude: event.location.longitude,
      lastKnownSpeed: event.lastKnownSpeed,
      crashDetected: true,
      movementHistory: event.movementHistory.slice(-20).map((r) => ({
        latitude: r.latitude,
        longitude: r.longitude,
        speed: r.smoothedSpeed,
        timestamp: r.timestamp,
      })),
      deviceInfo: {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
      },
    };
  }

  /**
   * Generic POST helper with timeout support.
   * TODO: Uncomment and use once the backend is live.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async post<T>(url: string, body: unknown): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return (await response.json()) as T;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private simulateNetworkDelay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/** Singleton instance for convenience. */
export const apiService = new ApiService();
