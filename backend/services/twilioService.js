'use strict';
/**
 * backend/services/twilioService.js
 * Twilio removed — SMS/call steps are now logged only.
 * The SOS chain still records each step in the DB for audit purposes.
 */

const env = require('../config/env');

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Simulate sending an SMS (logged only — no external service).
 */
async function sendSMS(to, message) {
  console.log(`[sosService] SMS (simulated) to ${to}: ${message}`);
  return { success: true, simulated: true };
}

/**
 * Simulate placing a voice call (logged only — no external service).
 */
async function makeCall(to, message) {
  console.log(`[sosService] Call (simulated) to ${to}: ${message}`);
  return { success: true, simulated: true };
}

/**
 * Trigger the emergency chain (all steps logged, no external calls made).
 *   1. Log family SMS
 *   2. Log family call attempt
 *   3. Log 108 ambulance
 *   4. Log 100 police
 */
async function triggerEmergencyChain(contactPhone, location, userName) {
  const locationStr = `Lat ${location.lat.toFixed(4)}, Lng ${location.lng.toFixed(4)}`;
  const steps = [];

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

  // Step 3 — Log 108 attempt
  await delay(3000);
  console.log(`[sosService] 108 (Ambulance) alert logged — ${locationStr}`);
  steps.push({
    step: 'ambulance_108',
    to: env.EMERGENCY_AMBULANCE,
    logged: true,
    note: 'Emergency number logged — contact manually or via IVR integration',
    timestamp: new Date().toISOString(),
  });

  // Step 4 — Log 100 attempt
  await delay(3000);
  console.log(`[sosService] 100 (Police) alert logged — ${locationStr}`);
  steps.push({
    step: 'police_100',
    to: env.EMERGENCY_POLICE,
    logged: true,
    note: 'Emergency number logged — contact manually or via IVR integration',
    timestamp: new Date().toISOString(),
  });

  return { steps };
}

module.exports = { sendSMS, makeCall, triggerEmergencyChain };
