'use strict';
/**
 * backend/services/eventHubService.js
 * Azure Event Hub publisher for SafeRoute events.
 */

const { EventHubProducerClient } = require('@azure/event-hubs');
const env = require('../config/env');

let _producer = null;

function getProducer() {
  if (!_producer) {
    _producer = new EventHubProducerClient(env.EVENTHUB_CONNECTION_STRING, env.EVENTHUB_NAME);
  }
  return _producer;
}

/**
 * Publish a structured event to Azure Event Hub.
 *
 * @param {string} eventType - e.g. 'complaint.created', 'sos.triggered'
 * @param {object} payload   - Event data to serialise as JSON.
 */
async function publishEvent(eventType, payload) {
  const producer = getProducer();
  const batch = await producer.createBatch();

  const event = {
    eventType,
    timestamp: new Date().toISOString(),
    source: 'saferoute-backend',
    data: payload,
  };

  const added = batch.tryAdd({ body: event });
  if (!added) {
    console.error('[eventHubService] Event too large for batch:', eventType);
    return { success: false, error: 'event_too_large' };
  }

  try {
    await producer.sendBatch(batch);
    console.log(`[eventHubService] ✅ Published: ${eventType}`);
    return { success: true };
  } catch (err) {
    console.error(`[eventHubService] Failed to publish ${eventType}:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Gracefully close the producer (call on process exit).
 */
async function closeProducer() {
  if (_producer) {
    await _producer.close();
    _producer = null;
  }
}

process.on('SIGTERM', closeProducer);
process.on('SIGINT', closeProducer);

module.exports = { publishEvent, closeProducer };
