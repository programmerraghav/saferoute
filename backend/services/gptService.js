'use strict';
/**
 * backend/services/gptService.js
 * GPT-4o service for generating human-readable summaries and messages.
 */

const axios = require('axios');
const env = require('../config/env');

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

/**
 * Internal helper — call OpenAI chat completions.
 * @param {string} systemPrompt
 * @param {string} userPrompt
 * @returns {Promise<string>} Generated text.
 */
async function _chat(systemPrompt, userPrompt) {
  try {
    const response = await axios.post(
      OPENAI_API_URL,
      {
        model: env.OPENAI_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 300,
        temperature: 0.6,
      },
      {
        headers: {
          Authorization: `Bearer ${env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 20000,
      }
    );
    return response.data.choices[0].message.content.trim();
  } catch (err) {
    console.error('[gptService] OpenAI API error:', err.response?.data || err.message);
    return null;
  }
}

/**
 * Generate a concise complaint summary for municipality records.
 *
 * @param {number} severity      - Pothole severity score 1-10.
 * @param {{lat:number,lng:number}} location - GPS coordinates.
 * @param {string} description   - User-supplied description (may be empty).
 * @param {string} potholeType   - 'small' | 'medium' | 'large'
 * @returns {Promise<string>} One-to-two sentence summary.
 */
async function generateComplaintSummary(severity, location, description, potholeType) {
  const system = `You are a road safety report writer for a municipality. 
Write concise, factual, professional 1-2 sentence summaries of pothole complaints for official records. 
Use clear language. Do not use markdown.`;

  const user = `Pothole report details:
- Severity: ${severity}/10 (${potholeType})
- Location: Lat ${location.lat}, Lng ${location.lng}
- Reporter description: "${description || 'No description provided'}"

Write a brief summary for the municipality complaint record.`;

  const result = await _chat(system, user);
  return result || `A ${potholeType} pothole with severity ${severity}/10 has been reported at coordinates (${location.lat}, ${location.lng}).`;
}

/**
 * Generate an emergency SOS alert message for SMS / voice calls.
 *
 * @param {string} userName - Name of the person in distress.
 * @param {{lat:number,lng:number}} location - GPS coordinates.
 * @returns {Promise<string>} Short, urgent emergency message.
 */
async function generateSOSMessage(userName, location) {
  const system = `You are an emergency alert system. 
Write short, urgent emergency messages under 160 characters for SMS alerts. 
Be direct, clear, and include the key facts only. No markdown.`;

  const user = `Generate an emergency SMS alert for:
- Person: ${userName}
- Location: Lat ${location.lat}, Lng ${location.lng}
- Situation: Possible road accident — SafeRoute auto-SOS triggered`;

  const result = await _chat(system, user);
  return result || `🚨 SOS: ${userName} may be in danger. Location: ${location.lat},${location.lng}. Check immediately.`;
}

module.exports = { generateComplaintSummary, generateSOSMessage };
