'use strict';
/**
 * backend/routes/dashboard.js
 */

const router = require('express').Router();
const { getDashboardComplaints, getHotspots, getStats } = require('../controllers/dashboardController');

// All complaints for map rendering (with optional filters)
router.get('/complaints', getDashboardComplaints);

// Top 10 worst road hotspots
router.get('/hotspots', getHotspots);

// Aggregate stats
router.get('/stats', getStats);

module.exports = router;
