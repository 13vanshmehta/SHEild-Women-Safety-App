const express = require('express');
const { body } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const authController = require('../controllers/authController');

const router = express.Router();

router.post('/register', [
    body('firstName').notEmpty().withMessage('First name is required'),
    body('lastName').notEmpty().withMessage('Last name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
], authController.register);

router.post('/verify-otp', [
    body('email').isEmail().withMessage('Valid email is required'),
    body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
], authController.verifyOtp);

router.post('/resend-otp', [
    body('email').isEmail().withMessage('Valid email is required'),
], authController.resendOtp);

router.post('/login', [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
], authController.login);

router.post('/forgot-password', [
    body('email').isEmail().withMessage('Valid email is required'),
], authController.forgotPassword);

router.post('/reset-password', [
    body('email').isEmail().withMessage('Valid email is required'),
    body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
    body('newPassword').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
], authController.resetPassword);

router.get('/profile', authenticateToken, authController.getProfile);

router.put('/profile', authenticateToken, [
    body('firstName').optional().notEmpty().withMessage('First name cannot be empty'),
    body('lastName').optional().notEmpty().withMessage('Last name cannot be empty'),
    body('phoneNumber').optional().isMobilePhone().withMessage('Invalid phone number'),
    body('dateOfBirth').optional().isISO8601().withMessage('Invalid date format'),
], authController.updateProfile);

router.post('/logout', authenticateToken, authController.logout);

router.delete('/profile', authenticateToken, authController.deleteProfile);

router.post('/fcm-token', authenticateToken, authController.updateFcmToken);

router.put('/notification-settings', authenticateToken, authController.updateNotificationSettings);

module.exports = router;
