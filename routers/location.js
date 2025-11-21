const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const locationController = require('../controllers/locationController');

// All routes require authentication
router.use(authenticateToken);

// Update current user's location
router.post('/update', locationController.updateLocation);

// Get all visible user locations for map
router.get('/visible', locationController.getVisibleLocations);

// Get specific user's location
router.get('/user/:targetUserId', locationController.getUserLocation);

// Update location sharing settings
router.put('/sharing-settings', locationController.updateSharingSettings);

// Update online status
router.put('/online-status', locationController.updateOnlineStatus);

module.exports = router;
