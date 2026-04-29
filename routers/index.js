const express = require('express');
const router = express.Router();

// Import individual routers
const authRoutes = require('./auth');
const googleAuthRoutes = require('./googleAuth');
const emergencyContactRoutes = require('./emergencyContacts');
const groupRoutes = require('./groups');
const sosRoutes = require('./sos');
const locationRoutes = require('./location');

const { healthCheck, apiTest } = require('../controllers/miscController');

// Misc Routes
router.get('/onboarding', healthCheck);
router.get('/test', apiTest);

// Use routers
router.use('/auth', authRoutes);
router.use('/auth', googleAuthRoutes);
router.use('/emergency-contacts', emergencyContactRoutes);
router.use('/groups', groupRoutes);
router.use('/sos', sosRoutes);
router.use('/location', locationRoutes);

module.exports = router;
