'use strict';
/**
 * backend/routes/alerts.js
 */

const router = require('express').Router();
const { sendNearbyAlert } = require('../controllers/alertController');

// Send push notifications to nearby drivers
router.post('/nearby', sendNearbyAlert);

module.exports = router;
