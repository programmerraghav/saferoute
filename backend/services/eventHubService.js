'use strict';
/**
 * backend/services/eventHubService.js
 * Event Hub publisher stub (Event Hub removed from project).
 */

/**
 * Publish a structured event (stubbed - logs to console only).
 *
 * @param {string} eventType - e.g. 'complaint.created', 'sos.triggered'
 * @param {object} payload   - Event data to serialise as JSON.
 */
async function publishEvent(eventType, payload) {
  console.log(`[eventHubService] [MOCK] Event logged: ${eventType}`, JSON.stringify(payload));
  return { success: true };
}

/**
 * Gracefully close the producer (stubbed).
 */
async function closeProducer() {
  // No-op stub
}

module.exports = { publishEvent, closeProducer };
