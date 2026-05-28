'use strict';
/**
 * backend/services/twilioService.js
 * SMS and voice-call helpers built on the Twilio SDK.
 */

const twilio = require('twilio');
const env = require('../config/env');

let _client = null;

function getClient() {
  if (!_client) {
    _client = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
  }
  return _client;
}

/**
 * Send an SMS to a phone number.
 * @param {string} to      - E.164 formatted destination number.
 * @param {string} message - SMS body text.
 */
async function sendSMS(to, message) {
  const client = getClient();
  try {
    const result = await client.messages.create({
      body: message,
      from: env.TWILIO_PHONE_NUMBER,
      to,
    });
    console.log(`[twilioService] SMS sent to ${to} — SID: ${result.sid}`);
    return { success: true, sid: result.sid };
  } catch (err) {
    console.error(`[twilioService] SMS to ${to} failed:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Place an automated voice call to a phone number using TwiML.
 * @param {string} to      - E.164 formatted destination number.
 * @param {string} message - Text to speak via TwiML <Say>.
 */
async function makeCall(to, message) {
  const client = getClient();
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice" language="en-IN">${message}</Say>
  <Pause length="2"/>
  <Say voice="alice" language="en-IN">This is an automated emergency alert from SafeRoute. Please respond immediately.</Say>
</Response>`;

  try {
    const call = await client.calls.create({
      twiml,
      from: env.TWILIO_PHONE_NUMBER,
      to,
    });
    console.log(`[twilioService] Call placed to ${to} — SID: ${call.sid}`);
    return { success: true, sid: call.sid };
  } catch (err) {
    console.error(`[twilioService] Call to ${to} failed:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Trigger the full emergency call chain:
 *   1. SMS to family contact
 *   2. Voice call to family contact (3 s delay)
 *   3. Log 108 ambulance attempt (6 s delay)
 *   4. Log 100 police attempt   (9 s delay)
 *
 * @param {string} contactPhone - Family contact E.164 phone number.
 * @param {{lat:number, lng:number}} location - GPS coordinates.
 * @param {string} userName - Name of the person in distress.
 * @returns {Promise<{steps: Array}>}
 */
async function triggerEmergencyChain(contactPhone, location, userName) {
  const locationStr = `Lat ${location.lat.toFixed(4)}, Lng ${location.lng.toFixed(4)}`;
  const steps = [];

  const delay = (ms) => new Promise((r) => setTimeout(r, ms));

  // Step 1 — Family SMS (immediate)
  const smsResult = await sendSMS(
    contactPhone,
    `🚨 EMERGENCY ALERT — ${userName} may have been in an accident. ` +
      `Location: https://maps.google.com/?q=${location.lat},${location.lng} (${locationStr}). ` +
      `This is an automated alert from SafeRoute.`
  );
  steps.push({ step: 'family_sms', to: contactPhone, ...smsResult, timestamp: new Date().toISOString() });

  // Step 2 — Family call (3 s delay)
  await delay(3000);
  const callResult = await makeCall(
    contactPhone,
    `Emergency alert. ${userName} may need immediate assistance. ` +
      `Their location is ${locationStr}. Please check on them immediately.`
  );
  steps.push({ step: 'family_call', to: contactPhone, ...callResult, timestamp: new Date().toISOString() });

  // Step 3 — Log 108 attempt (6 s delay from start)
  await delay(3000);
  console.log(`[twilioService] 108 (Ambulance) alert logged — ${locationStr}`);
  steps.push({
    step: 'ambulance_108',
    to: env.EMERGENCY_AMBULANCE,
    logged: true,
    note: 'Direct emergency number — operator should call manually or via IVR integration',
    timestamp: new Date().toISOString(),
  });

  // Step 4 — Log 100 attempt (9 s delay from start)
  await delay(3000);
  console.log(`[twilioService] 100 (Police) alert logged — ${locationStr}`);
  steps.push({
    step: 'police_100',
    to: env.EMERGENCY_POLICE,
    logged: true,
    note: 'Direct emergency number — operator should call manually or via IVR integration',
    timestamp: new Date().toISOString(),
  });

  return { steps };
}

module.exports = { sendSMS, makeCall, triggerEmergencyChain };
