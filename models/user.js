const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: true,
    },
    lastName: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },
    password: {
        type: String,
        required: function() {
            return this.loginType === 'email';
        },
        select: false, // Don't return password in queries by default
    },
    loginType:{
        type: String,
        enum: ['email', 'google', 'apple'],
        default: 'email',
    },
    profilePicture: {
        type: String,
        default: null,
    },
    phoneNumber: {
        type: String,
        default: null,
    },
    dateOfBirth: {
        type: Date,
        default: null,
    },
    isEmailVerified: {
        type: Boolean,
        default: false,
    },
    // OTP for email verification (after registration/login)
    emailVerifyOtp: {
        code: { type: String, default: null },
        expiresAt: { type: Date, default: null },
        attempts: { type: Number, default: 0 },
    },
    // OTP for password reset
    resetOtp: {
        code: { type: String, default: null },
        expiresAt: { type: Date, default: null },
        attempts: { type: Number, default: 0 },
    },
    googleId: {
        type: String,
        default: null,
    },
    appleId: {
        type: String,
        default: null,
    },
    fcmToken: {
        type: String,
        default: null,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    notificationSettings: {
        allEnabled: { type: Boolean, default: true },
        groupMessages: { type: Boolean, default: true },
        sosAlerts: { type: Boolean, default: true },
        emergencyAlerts: { type: Boolean, default: true }
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
});

// ==========================================
// Pre-save middleware — hash password
// ==========================================
userSchema.pre('save', async function (next) {
    // Only hash if password is modified
    if (!this.isModified('password') || !this.password) return next();

    try {
        const salt = await bcrypt.genSalt(12);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// ==========================================
// Instance Methods
// ==========================================

/**
 * Compare entered password with hashed password
 */
userSchema.methods.comparePassword = async function (candidatePassword) {
    if (!this.password) return false;
    return bcrypt.compare(candidatePassword, this.password);
};

/**
 * Generate OTP for email verification (6 digits)
 */
userSchema.methods.generateEmailVerifyOtp = function () {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    this.emailVerifyOtp = {
        code: otp,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
        attempts: 0,
    };
    return otp;
};

/**
 * Verify email OTP
 */
userSchema.methods.verifyEmailOtp = function (candidateOtp) {
    if (!this.emailVerifyOtp.code) return false;
    if (this.emailVerifyOtp.expiresAt < new Date()) return false;
    if (this.emailVerifyOtp.attempts >= 5) return false; // Max 5 attempts
    
    this.emailVerifyOtp.attempts += 1;
    return this.emailVerifyOtp.code === candidateOtp;
};

/**
 * Clear email verify OTP
 */
userSchema.methods.clearEmailOtp = function () {
    this.emailVerifyOtp = { code: null, expiresAt: null, attempts: 0 };
};

/**
 * Generate OTP for password reset (6 digits)
 */
userSchema.methods.generateResetOtp = function () {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    this.resetOtp = {
        code: otp,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
        attempts: 0,
    };
    return otp;
};

/**
 * Verify reset OTP
 */
userSchema.methods.verifyResetOtp = function (candidateOtp) {
    if (!this.resetOtp.code) return false;
    if (this.resetOtp.expiresAt < new Date()) return false;
    if (this.resetOtp.attempts >= 5) return false; // Max 5 attempts
    
    this.resetOtp.attempts += 1;
    return this.resetOtp.code === candidateOtp;
};

/**
 * Clear reset OTP
 */
userSchema.methods.clearResetOtp = function () {
    this.resetOtp = { code: null, expiresAt: null, attempts: 0 };
};

/**
 * Generate OTP for password reset (6 digits)
 */
userSchema.methods.generateResetOtp = function () {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    this.resetOtp = {
        code: otp,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
        attempts: 0,
    };
    return otp;
};

/**
 * Verify reset OTP
 */
userSchema.methods.verifyResetOtp = function (candidateOtp) {
    if (!this.resetOtp.code) return false;
    if (this.resetOtp.expiresAt < new Date()) return false;
    if (this.resetOtp.attempts >= 5) return false;

    this.resetOtp.attempts += 1;
    return this.resetOtp.code === candidateOtp;
};

/**
 * Clear reset OTP
 */
userSchema.methods.clearResetOtp = function () {
    this.resetOtp = { code: null, expiresAt: null, attempts: 0 };
};

const User = mongoose.model('User', userSchema);
module.exports = User;