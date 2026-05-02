const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User = require('../models/user');
const { sendOTPEmail, sendPasswordResetOtpEmail, sendWelcomeEmail } = require('../utilities/emailService');

// ==========================================
// Password Strength Validator
// ==========================================
const validatePasswordStrength = (password) => {
    if (password.length < 8) {
        return { valid: false, message: 'Password must be at least 8 characters long.' };
    }
    // At least one uppercase, one lowercase, one number, one special character
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])/;
    if (!passwordRegex.test(password)) {
        return { 
            valid: false, 
            message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.' 
        };
    }
    return { valid: true };
};

const generateToken = (userId) => {
    return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

const buildPublicUser = (user) => ({
    id: user._id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    isEmailVerified: user.isEmailVerified,
    profilePicture: user.profilePicture,
    phoneNumber: user.phoneNumber,
    loginType: user.loginType,
});

const handleValidationErrors = (req, res) => {
    const errors = validationResult(req);
    if (errors.isEmpty()) return false;

    res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
    });
    return true;
};

const register = async (req, res) => {
    try {
        if (handleValidationErrors(req, res)) return;

        const { firstName, lastName, email, password } = req.body;

        // Validate password strength
        const passwordValidation = validatePasswordStrength(password);
        if (!passwordValidation.valid) {
            return res.status(400).json({
                success: false,
                message: passwordValidation.message
            });
        }

        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: 'An account with this email already exists.'
            });
        }

        const user = new User({
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            email: email.toLowerCase().trim(),
            password,
            loginType: 'email',
            isEmailVerified: false,
        });

        await user.save();

        const otp = user.generateEmailVerifyOtp();
        await user.save();

        sendOTPEmail(user.email, otp, user.firstName).catch(err =>
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
};

const verifyOtp = async (req, res) => {
    try {
        if (handleValidationErrors(req, res)) return;

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

        if (!user.verifyEmailOtp(otp)) {
            await user.save();
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired OTP'
            });
        }

        user.isEmailVerified = true;
        user.clearEmailOtp();
        await user.save();

        try {
            await sendWelcomeEmail(user.email, user.firstName);
        } catch (emailError) {
            console.error('Welcome email failed:', emailError);
        }

        const token = generateToken(user._id);

        res.json({
            success: true,
            message: 'Email verified successfully',
            data: {
                token,
                user: buildPublicUser(user)
            }
        });
    } catch (error) {
        console.error('OTP verification error:', error);
        res.status(500).json({
            success: false,
            message: 'Verification failed. Please try again.'
        });
    }
};

const resendOtp = async (req, res) => {
    try {
        if (handleValidationErrors(req, res)) return;

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

        const otp = user.generateEmailVerifyOtp();
        await user.save();

        sendOTPEmail(user.email, otp, user.firstName).catch(err =>
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
};

const login = async (req, res) => {
    try {
        if (handleValidationErrors(req, res)) return;

        const { email, password, latitude, longitude } = req.body;
        const user = await User.findOne({ email: email.toLowerCase(), loginType: 'email' }).select('+password');

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password.'
            });
        }

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

        if (!user.isEmailVerified) {
            const otp = user.generateEmailVerifyOtp();
            await user.save();

            sendOTPEmail(user.email, otp, user.firstName).catch(err =>
                console.error('[OTP] Login resend failed:', err.message)
            );

            return res.status(403).json({
                success: false,
                code: 'EMAIL_NOT_VERIFIED',
                needsVerification: true,
                message: 'Email not verified. A new OTP has been sent to your email.',
                email: user.email,
                data: {
                    email: user.email,
                    isEmailVerified: false
                }
            });
        }

        // Store coordinates if provided during login
        if (latitude && longitude) {
            const UserLocation = require('../models/userLocation');
            const userData = {
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                profilePicture: user.profilePicture,
                isOnline: true,
                lastActiveAt: new Date()
            };
            const newCoords = { latitude, longitude };
            await UserLocation.updateWithHistory(user._id, userData, newCoords).catch(err => 
                console.error('Failed to update location during login:', err)
            );
        }

        const token = generateToken(user._id);

        res.json({
            success: true,
            message: 'Login successful',
            data: {
                token,
                user: buildPublicUser(user)
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Login failed. Please try again.'
        });
    }
};

const forgotPassword = async (req, res) => {
    try {
        if (handleValidationErrors(req, res)) return;

        const { email } = req.body;
        const user = await User.findOne({ email: email.toLowerCase(), loginType: 'email' });

        if (!user) {
            // Don't reveal if user exists (security best practice)
            return res.status(200).json({
                success: true,
                message: 'If an account with this email exists, an OTP has been sent.'
            });
        }

        const otp = user.generateResetOtp();
        await user.save();

        sendPasswordResetOtpEmail(user.email, otp, user.firstName).catch(err =>
            console.error('[OTP] Password reset send failed:', err.message)
        );

        res.json({
            success: true,
            message: 'If an account with this email exists, an OTP has been sent.',
            data: { email: user.email }
        });
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to process request.'
        });
    }
};

const resetPassword = async (req, res) => {
    try {
        if (handleValidationErrors(req, res)) return;

        const { email, otp, newPassword } = req.body;
        
        // Validate new password strength
        const passwordValidation = validatePasswordStrength(newPassword);
        if (!passwordValidation.valid) {
            return res.status(400).json({
                success: false,
                message: passwordValidation.message
            });
        }

        const user = await User.findOne({ email: email.toLowerCase(), loginType: 'email' }).select('+password');

        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Invalid request.'
            });
        }

        if (!user.verifyResetOtp(otp)) {
            await user.save();
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired OTP.'
            });
        }

        user.password = newPassword;
        user.clearResetOtp();
        user.updatedAt = new Date();
        await user.save();

        res.json({
            success: true,
            message: 'Password reset successfully. Please sign in with your new password.'
        });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({
            success: false,
            message: 'Password reset failed.'
        });
    }
};

const getProfile = async (req, res) => {
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
                    ...buildPublicUser(user),
                    dateOfBirth: user.dateOfBirth,
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
};

const updateProfile = async (req, res) => {
    try {
        if (handleValidationErrors(req, res)) return;

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
                    ...buildPublicUser(user),
                    dateOfBirth: user.dateOfBirth,
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
};

const logout = async (req, res) => {
    try {
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
};

const deleteProfile = async (req, res) => {
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
};

const updateFcmToken = async (req, res) => {
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
};

const updateNotificationSettings = async (req, res) => {
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
};

module.exports = {
    register,
    verifyOtp,
    resendOtp,
    login,
    forgotPassword,
    resetPassword,
    getProfile,
    updateProfile,
    logout,
    deleteProfile,
    updateFcmToken,
    updateNotificationSettings,
};
