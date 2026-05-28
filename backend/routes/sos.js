'use strict';
/**
 * backend/routes/sos.js
 */

const router = require('express').Router();
const { triggerSOS, cancelSOS, getSOSEvent } = require('../controllers/sosController');

// Trigger an emergency SOS alert
router.post('/trigger', triggerSOS);

// Cancel an active SOS within the cancel window
router.post('/cancel', cancelSOS);

// Get a SOS event by ID
router.get('/:id', getSOSEvent);

module.exports = router;
