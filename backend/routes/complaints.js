'use strict';
/**
 * backend/routes/complaints.js
 */

const router = require('express').Router();
const { upload, handleUploadError } = require('../middleware/upload');
const { registerComplaint, analyzeComplaint, getComplaint, getComplaintsByLocation, updateComplaintStatus } = require('../controllers/complaintController');

// Analyze + register a pothole complaint (used by the frontend ReportPothole page)
router.post('/analyze', upload.single('image'), handleUploadError, analyzeComplaint);

// Register a new pothole complaint (with image upload)
router.post('/register', upload.single('image'), handleUploadError, registerComplaint);

// Get complaints within a GPS radius
router.get('/', getComplaintsByLocation);

// Get a single complaint by ID
router.get('/:id', getComplaint);

// Update complaint status (municipality use)
router.patch('/:id/status', updateComplaintStatus);

module.exports = router;

