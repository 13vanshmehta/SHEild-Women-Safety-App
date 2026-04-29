const mongoose = require('mongoose');

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
    },
    password: {
        type: String,
        required: function() {
            return this.loginType === 'email';
        },
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
    otp: {
        type: String,
        default: null,
    },
    otpExpires: {
        type: Date,
        default: null,
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

const User = mongoose.model('User', userSchema);
module.exports = User;