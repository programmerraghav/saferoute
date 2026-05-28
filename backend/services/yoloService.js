'use strict';
/**
 * backend/services/yoloService.js
 * Proxies image analysis requests to the FastAPI ML server.
 */

const axios = require('axios');
const FormData = require('form-data');
const env = require('../config/env');

/**
 * Send an image buffer to the YOLO FastAPI server and return detection results.
 *
 * @param {Buffer} imageBuffer  - Raw image bytes.
 * @param {string} originalName - Original filename (for content-type inference).
 * @param {string} mimeType     - MIME type (e.g. 'image/jpeg').
 * @returns {Promise<{confirmed:boolean, severity:number, confidence:number, pothole_type:string, bbox:number[]|null}>}
 */
async function analyzeImage(imageBuffer, originalName, mimeType) {
  const form = new FormData();
  form.append('file', imageBuffer, {
    filename: originalName || 'upload.jpg',
    contentType: mimeType || 'image/jpeg',
  });

  try {
    const response = await axios.post(env.YOLO_API_URL, form, {
      headers: {
        ...form.getHeaders(),
      },
      timeout: 30000, // 30 s
    });
    return response.data;
  } catch (err) {
    if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND' || err.code === 'ETIMEDOUT') {
      console.error(`[yoloService] ML server unreachable at ${env.YOLO_API_URL}:`, err.message);
      return { confirmed: false, severity: 0, confidence: 0, pothole_type: 'none', bbox: null, error: 'model_unavailable' };
    }
    if (err.response) {
      console.error(`[yoloService] ML server returned ${err.response.status}:`, err.response.data);
      return { confirmed: false, severity: 0, confidence: 0, pothole_type: 'none', bbox: null, error: `ml_error_${err.response.status}` };
    }
    console.error('[yoloService] Unexpected error:', err.message);
    return { confirmed: false, severity: 0, confidence: 0, pothole_type: 'none', bbox: null, error: 'unknown' };
  }
}

module.exports = { analyzeImage };
