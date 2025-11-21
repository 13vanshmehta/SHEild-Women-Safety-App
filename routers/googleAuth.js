const express = require('express');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/user');
const { sendWelcomeEmail } = require('../utilities/emailService');

const router = express.Router();

// Configure Google OAuth Strategy (only if credentials are provided)
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || "/api/auth/google/callback"
    }, async (accessToken, refreshToken, profile, done) => {
    try {
        // Check if user already exists with this Google ID
        let user = await User.findOne({ googleId: profile.id });
        
        if (user) {
            return done(null, user);
        }

        // Check if user exists with same email but different login type
        user = await User.findOne({ email: profile.emails[0].value });
        
        if (user) {
            // Update existing user to include Google ID
            user.googleId = profile.id;
            user.loginType = 'google';
            user.profilePicture = profile.photos[0]?.value || null;
            await user.save();
            return done(null, user);
        }

        // Create new user
        const nameParts = profile.displayName.split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';

        user = new User({
            firstName,
            lastName,
            email: profile.emails[0].value,
            googleId: profile.id,
            loginType: 'google',
            profilePicture: profile.photos[0]?.value || null,
            isEmailVerified: true // Google emails are pre-verified
        });

        await user.save();

        // Send welcome email
        try {
            await sendWelcomeEmail(user.email, user.firstName);
        } catch (emailError) {
            console.error('Failed to send welcome email:', emailError);
            // Don't fail the registration if email fails
        }

        return done(null, user);
    } catch (error) {
        console.error('Google OAuth error:', error);
        return done(error, null);
    }
    }));
} else {
    console.log('Google OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env');
}

// Serialize user for session
passport.serializeUser((user, done) => {
    done(null, user._id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (error) {
        done(error, null);
    }
});

// Google OAuth routes
router.get('/google', passport.authenticate('google', {
    scope: ['profile', 'email']
}));

router.get('/google/callback', 
    passport.authenticate('google', { failureRedirect: '/api/auth/google/failure' }),
    (req, res) => {
        try {
            // Generate JWT token
            const jwt = require('jsonwebtoken');
            const token = jwt.sign({ userId: req.user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
            
            // Redirect to frontend with token
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
            res.redirect(`${frontendUrl}/auth/callback?token=${token}&success=true`);
        } catch (error) {
            console.error('Google callback error:', error);
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
            res.redirect(`${frontendUrl}/auth/callback?success=false&error=authentication_failed`);
        }
    }
);

router.get('/google/failure', (req, res) => {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/auth/callback?success=false&error=google_auth_failed`);
});

// Get Google OAuth URL (for mobile apps)
router.get('/google/url', (req, res) => {
    try {
        const googleAuthUrl = `https://accounts.google.com/oauth/authorize?` +
            `client_id=${process.env.GOOGLE_CLIENT_ID}&` +
            `redirect_uri=${encodeURIComponent(process.env.GOOGLE_CALLBACK_URL)}&` +
            `scope=profile email&` +
            `response_type=code&` +
            `access_type=offline`;

        res.json({
            success: true,
            data: {
                authUrl: googleAuthUrl
            }
        });
    } catch (error) {
        console.error('Google URL generation error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate Google auth URL'
        });
    }
});

// Handle Google OAuth callback from mobile
router.post('/google/mobile', async (req, res) => {
    try {
        const { accessToken } = req.body;

        if (!accessToken) {
            return res.status(400).json({
                success: false,
                message: 'Access token is required'
            });
        }

        // Check if Google OAuth is configured
        if (!process.env.GOOGLE_CLIENT_ID) {
            console.error('GOOGLE_CLIENT_ID not configured in environment variables');
            return res.status(500).json({
                success: false,
                message: 'Google OAuth is not configured. Please set GOOGLE_CLIENT_ID in .env file'
            });
        }

        // Verify the access token with Google
        const { OAuth2Client } = require('google-auth-library');
        const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

        // Accept Web, iOS, and Android Client IDs as valid audiences
        const validAudiences = [
            process.env.GOOGLE_CLIENT_ID, // Web Client ID
            process.env.GOOGLE_IOS_CLIENT_ID, // iOS Client ID
            process.env.GOOGLE_ANDROID_CLIENT_ID, // Android Client ID
        ].filter(Boolean); // Remove undefined values

        const ticket = await client.verifyIdToken({
            idToken: accessToken,
            audience: validAudiences,
        });

        const payload = ticket.getPayload();
        const { sub: googleId, email, name, picture } = payload;

        // Check if user already exists
        let user = await User.findOne({ googleId });
        
        if (!user) {
            // Check if user exists with same email
            user = await User.findOne({ email });
            
            if (user) {
                // Update existing user
                user.googleId = googleId;
                user.loginType = 'google';
                user.profilePicture = picture || null;
                await user.save();
            } else {
                // Create new user
                const nameParts = name.split(' ');
                const firstName = nameParts[0] || '';
                const lastName = nameParts.slice(1).join(' ') || '';

                user = new User({
                    firstName,
                    lastName,
                    email,
                    googleId,
                    loginType: 'google',
                    profilePicture: picture || null,
                    isEmailVerified: true
                });

                await user.save();

                // Send welcome email
                try {
                    await sendWelcomeEmail(user.email, user.firstName);
                } catch (emailError) {
                    console.error('Failed to send welcome email:', emailError);
                }
            }
        }

        // Generate JWT token
        const jwt = require('jsonwebtoken');
        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

        res.json({
            success: true,
            message: 'Google authentication successful',
            data: {
                token,
                user: {
                    id: user._id,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    email: user.email,
                    isEmailVerified: user.isEmailVerified,
                    profilePicture: user.profilePicture,
                    phoneNumber: user.phoneNumber,
                    loginType: user.loginType
                }
            }
        });

    } catch (error) {
        console.error('Google mobile auth error:', error);
        
        // Provide detailed error message
        let errorMessage = 'Google authentication failed';
        if (error.message) {
            errorMessage = error.message;
        } else if (error.code) {
            errorMessage = `Error: ${error.code}`;
        }
        
        res.status(500).json({
            success: false,
            message: errorMessage,
            error: error.toString()
        });
    }
});

// Handle Google OAuth registration from mobile (for new users)
router.post('/google/register', async (req, res) => {
    try {
        const { accessToken } = req.body;

        if (!accessToken) {
            return res.status(400).json({
                success: false,
                message: 'Access token is required'
            });
        }

        // Check if Google OAuth is configured
        if (!process.env.GOOGLE_CLIENT_ID) {
            console.error('GOOGLE_CLIENT_ID not configured in environment variables');
            return res.status(500).json({
                success: false,
                message: 'Google OAuth is not configured. Please set GOOGLE_CLIENT_ID in .env file'
            });
        }

        // Verify the access token with Google
        const { OAuth2Client } = require('google-auth-library');
        const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

        // Accept Web, iOS, and Android Client IDs as valid audiences
        const validAudiences = [
            process.env.GOOGLE_CLIENT_ID, // Web Client ID
            process.env.GOOGLE_IOS_CLIENT_ID, // iOS Client ID
            process.env.GOOGLE_ANDROID_CLIENT_ID, // Android Client ID
        ].filter(Boolean); // Remove undefined values

        const ticket = await client.verifyIdToken({
            idToken: accessToken,
            audience: validAudiences,
        });

        const payload = ticket.getPayload();
        const { sub: googleId, email, name, picture } = payload;

        // Check if user already exists with this Google ID
        let existingUser = await User.findOne({ googleId });
        
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'Account with this Google ID already exists. Please sign in instead.',
                code: 'USER_EXISTS'
            });
        }

        // Check if user exists with same email
        existingUser = await User.findOne({ email });
        
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'Account with this email already exists. Please sign in instead.',
                code: 'EMAIL_EXISTS'
            });
        }

        // Create new user (registration)
        const nameParts = name.split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';

        const user = new User({
            firstName,
            lastName,
            email,
            googleId,
            loginType: 'google',
            profilePicture: picture || null,
            isEmailVerified: true
        });

        await user.save();

        // Send welcome email
        try {
            await sendWelcomeEmail(user.email, user.firstName);
        } catch (emailError) {
            console.error('Failed to send welcome email:', emailError);
            // Don't fail the registration if email fails
        }

        // Generate JWT token
        const jwt = require('jsonwebtoken');
        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

        res.json({
            success: true,
            message: 'Google registration successful',
            data: {
                token,
                user: {
                    id: user._id,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    email: user.email,
                    isEmailVerified: user.isEmailVerified,
                    profilePicture: user.profilePicture,
                    phoneNumber: user.phoneNumber,
                    loginType: user.loginType
                }
            }
        });

    } catch (error) {
        console.error('Google registration error:', error);
        
        // Provide detailed error message
        let errorMessage = 'Google registration failed';
        if (error.message) {
            errorMessage = error.message;
        } else if (error.code) {
            errorMessage = `Error: ${error.code}`;
        }
        
        res.status(500).json({
            success: false,
            message: errorMessage,
            error: error.toString()
        });
    }
});

module.exports = router;
