const express = require('express');
const router = express.Router();
const sosController = require('../controllers/sosController');
const { authenticateToken } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// Trigger SOS alert
router.post('/trigger', sosController.triggerSOS);

// Update location (for offline/online scenarios)
router.post('/update-location', sosController.updateLocation);

// Get SOS history
router.get('/history', sosController.getSOSHistory);

// Get SOS alert details
router.get('/:alertId', sosController.getSOSDetails);

// Cancel SOS alert
router.post('/:alertId/cancel', sosController.cancelSOS);

// Resolve SOS alert
router.post('/:alertId/resolve', sosController.resolveSOS);

module.exports = router;
