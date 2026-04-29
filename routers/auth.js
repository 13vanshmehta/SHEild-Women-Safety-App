const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/user');
const { sendOTPEmail, sendWelcomeEmail } = require('../utilities/emailService');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Generate JWT Token
const generateToken = (userId) => {
    return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// ==========================================
// Register User
// ==========================================
router.post('/register', [
    body('firstName').notEmpty().withMessage('First name is required'),
    body('lastName').notEmpty().withMessage('Last name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                success: false, 
                message: 'Validation failed', 
                errors: errors.array() 
            });
        }

        const { firstName, lastName, email, password } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: 'An account with this email already exists.'
            });
        }

        // Create user with password (NOT verified yet)
        const user = new User({
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            email: email.toLowerCase().trim(),
            password,
            loginType: 'email',
            isEmailVerified: false,
        });

        await user.save();

        // Generate email verification OTP
        const otp = user.generateEmailVerifyOtp();
        await user.save();

        // Fire-and-forget: UI responds instantly, email sends in background
        sendOTPEmail(user.email, otp).catch(err =>
            console.error('[OTP] Register send failed:', err.message)
        );

        res.status(201).json({
            success: true,
            message: 'Account created! Please verify your email with the OTP sent.',
            data: {
                userId: user._id,
                email: user.email,
                isEmailVerified: user.isEmailVerified
            }
        });

    } catch (error) {
        console.error('Registration error:', error);
        
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: 'An account with this email already exists.'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Registration failed. Please try again.'
        });
    }
});

// ==========================================
// Verify Email OTP
// ==========================================
router.post('/verify-otp', [
    body('email').isEmail().withMessage('Valid email is required'),
    body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                success: false, 
                message: 'Validation failed', 
                errors: errors.array() 
            });
        }

        const { email, otp } = req.body;

        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        if (user.isEmailVerified) {
            return res.status(400).json({
                success: false,
                message: 'Email already verified'
            });
        }

        // Verify OTP using the model method
        if (!user.verifyEmailOtp(otp)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired OTP'
            });
        }

        // Mark email as verified and clear OTP
        user.isEmailVerified = true;
        user.clearEmailOtp();
        await user.save();

        // Send welcome email
        try {
            await sendWelcomeEmail(user.email, user.firstName);
        } catch (emailError) {
            console.error('Welcome email failed:', emailError);
        }

        // Generate JWT token
        const token = generateToken(user._id);

        res.json({
            success: true,
            message: 'Email verified successfully',
            data: {
                token,
                user: {
                    id: user._id,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    email: user.email,
                    isEmailVerified: user.isEmailVerified,
                    profilePicture: user.profilePicture,
                    phoneNumber: user.phoneNumber
                }
            }
        });

    } catch (error) {
        console.error('OTP verification error:', error);
        res.status(500).json({
            success: false,
            message: 'Verification failed. Please try again.'
        });
    }
});

// ==========================================
// Resend Email Verification OTP
// ==========================================
router.post('/resend-otp', [
    body('email').isEmail().withMessage('Valid email is required'),
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                success: false, 
                message: 'Validation failed', 
                errors: errors.array() 
            });
        }

        const { email } = req.body;

        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        if (user.isEmailVerified) {
            return res.status(400).json({
                success: false,
                message: 'Email already verified'
            });
        }

        // Generate new OTP
        const otp = user.generateEmailVerifyOtp();
        await user.save();

        // Fire-and-forget: UI responds instantly, email sends in background
        sendOTPEmail(user.email, otp).catch(err =>
            console.error('[OTP] Resend send failed:', err.message)
        );

        res.json({ 
            success: true, 
            message: 'OTP sent successfully',
            data: { email: user.email }
        });

    } catch (error) {
        console.error('Resend OTP error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to resend OTP. Please try again.'
        });
    }
});

// ==========================================
// Login User
// ==========================================
router.post('/login', [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                success: false, 
                message: 'Validation failed', 
                errors: errors.array() 
            });
        }

        const { email, password } = req.body;

        // Find user with password field
        const user = await User.findOne({ email: email.toLowerCase(), loginType: 'email' }).select('+password');
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password.'
            });
        }

        // Verify password
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password.'
            });
        }

        if (!user.isActive) {
            return res.status(403).json({
                success: false,
                message: 'Your account has been deactivated.'
            });
        }

        // Check if email is verified
        if (!user.isEmailVerified) {
            // Generate and send new OTP
            const otp = user.generateEmailVerifyOtp();
            await user.save();
            // Fire-and-forget: respond instantly, send OTP in background
            sendOTPEmail(user.email, otp).catch(err =>
                console.error('[OTP] Login resend failed:', err.message)
            );
            return res.status(403).json({
                success: false,
                code: 'EMAIL_NOT_VERIFIED',
                message: 'Email not verified. A new OTP has been sent to your email.',
                data: { 
                    email: user.email,
                    isEmailVerified: false 
                }
            });
        }

        // Generate JWT token
        const token = generateToken(user._id);

        res.json({
            success: true,
            message: 'Login successful',
            data: {
                token,
                user: {
                    id: user._id,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    email: user.email,
                    isEmailVerified: user.isEmailVerified,
                    profilePicture: user.profilePicture,
                    phoneNumber: user.phoneNumber
                }
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Login failed. Please try again.'
        });
    }
});

// ==========================================
// Get User Profile
// ==========================================
router.get('/profile', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select('-password -emailVerifyOtp -resetOtp');
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            data: {
                user: {
                    id: user._id,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    email: user.email,
                    isEmailVerified: user.isEmailVerified,
                    profilePicture: user.profilePicture,
                    phoneNumber: user.phoneNumber,
                    dateOfBirth: user.dateOfBirth,
                    loginType: user.loginType,
                    createdAt: user.createdAt
                }
            }
        });

    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch profile.'
        });
    }
});

// ==========================================
// Update User Profile
// ==========================================
router.put('/profile', authenticateToken, [
    body('firstName').optional().notEmpty().withMessage('First name cannot be empty'),
    body('lastName').optional().notEmpty().withMessage('Last name cannot be empty'),
    body('phoneNumber').optional().isMobilePhone().withMessage('Invalid phone number'),
    body('dateOfBirth').optional().isISO8601().withMessage('Invalid date format'),
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                success: false, 
                message: 'Validation failed', 
                errors: errors.array() 
            });
        }

        const { firstName, lastName, phoneNumber, dateOfBirth } = req.body;
        const updateData = {};

        if (firstName) updateData.firstName = firstName.trim();
        if (lastName) updateData.lastName = lastName.trim();
        if (phoneNumber) updateData.phoneNumber = phoneNumber;
        if (dateOfBirth) updateData.dateOfBirth = dateOfBirth;

        updateData.updatedAt = new Date();

        const user = await User.findByIdAndUpdate(
            req.user.userId,
            updateData,
            { new: true, select: '-password -emailVerifyOtp -resetOtp' }
        );

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            message: 'Profile updated successfully',
            data: {
                user: {
                    id: user._id,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    email: user.email,
                    isEmailVerified: user.isEmailVerified,
                    profilePicture: user.profilePicture,
                    phoneNumber: user.phoneNumber,
                    dateOfBirth: user.dateOfBirth,
                    loginType: user.loginType,
                    updatedAt: user.updatedAt
                }
            }
        });

    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update profile.'
        });
    }
});

// ==========================================
// Logout User
// ==========================================
router.post('/logout', authenticateToken, async (req, res) => {
    try {
        // JWT tokens are stateless, so logout is handled on the client side
        res.json({
            success: true,
            message: 'Logged out successfully'
        });

    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            success: false,
            message: 'Logout failed.'
        });
    }
});

// ==========================================
// Delete User Account
// ==========================================
router.delete('/profile', authenticateToken, async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.user.userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            message: 'Account deleted successfully'
        });

    } catch (error) {
        console.error('Delete account error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete account.'
        });
    }
});

// ==========================================
// Update FCM Token
// ==========================================
router.post('/fcm-token', authenticateToken, async (req, res) => {
    try {
        const { fcmToken } = req.body;
        if (!fcmToken) {
            return res.status(400).json({
                success: false,
                message: 'FCM Token is required'
            });
        }

        await User.findByIdAndUpdate(req.user.userId, { fcmToken, updatedAt: new Date() });

        res.json({
            success: true,
            message: 'FCM Token updated successfully'
        });
    } catch (error) {
        console.error('Update FCM Token error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update FCM token.'
        });
    }
});

// ==========================================
// Update Notification Settings
// ==========================================
router.put('/notification-settings', authenticateToken, async (req, res) => {
    try {
        const { settings } = req.body;
        if (!settings) {
            return res.status(400).json({
                success: false,
                message: 'Settings are required'
            });
        }

        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        user.notificationSettings = { ...user.notificationSettings, ...settings };
        user.updatedAt = new Date();
        await user.save();

        res.json({
            success: true,
            message: 'Notification settings updated successfully',
            data: { settings: user.notificationSettings }
        });
    } catch (error) {
        console.error('Update notification settings error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update notification settings.'
        });
    }
});

module.exports = router;

