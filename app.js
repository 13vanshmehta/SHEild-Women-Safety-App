process.env.DOTENV_QUIET = 'true';
require("dotenv").config({ debug: false });
const express = require('express');
const http = require("http");
const cors = require("cors");
const passport = require('passport');
const path = require('path');
const mongoose = require('mongoose');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

// Configurations
const connection = require("./utilities/connection");
const initSocket = require("./services/socketService");
const apiRoutes = require('./routers/index');

// Initialize App
const app = express();
app.set('trust proxy', 1); // Trust Render proxy
const server = http.createServer(app);
const port = process.env.PORT || 8000;

// Mongoose Configuration
mongoose.set('strictQuery', false);
mongoose.set('autoIndex', true);

// Database Connection
connection();

// --- API Gateway & Security Middlewares ---

// 1. Security Headers
app.use(helmet());

// 2. Logging (Production format)
app.use(morgan('combined'));

// 3. Rate Limiting (Prevent Brute Force)
const apiLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minutes
    max: 100, // Increased limit for development/testing
    message: {
        success: false,
        message: 'Too many requests from this IP, please try again after 1 minutes'
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Apply rate limiter to all api routes
app.use('/api', apiLimiter);

// --- Standard Middlewares ---
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(cors({
    origin: true, // In production, replace with specific domain
    credentials: true
}));
app.use(passport.initialize());

// Socket.io Initialization
const io = initSocket(server);
app.set('io', io);
global.io = io;

// API Routes
app.use('/api', apiRoutes);

app.get('/', (req, res) => {
    res.json({ message: 'SHEild API is running' });
});

const { healthCheck } = require('./controllers/miscController');
app.get('/onboarding', healthCheck);

server.listen(port, () => {
    console.log(`Server is running on port ${port}`);

    // Self-ping to keep backend alive (especially for Render free tier)
    const { SELF_PING_URL, BACKEND_URL, SELF_PING_INTERVAL_MS } = process.env;
    const pingUrl = SELF_PING_URL || BACKEND_URL || `http://localhost:${port}/onboarding`;
    const interval = parseInt(SELF_PING_INTERVAL_MS || '', 10) || 1 * 60 * 1000; // default 5 minutes

    // Use native http/https based on URL protocol
    try {
        const urlObj = new URL(pingUrl);
        const client = urlObj.protocol === 'https:' ? require('https') : require('http');

        setInterval(() => {
            const req = client.get(pingUrl, (res) => {
                // drain response
                res.on('data', () => { });
                res.on('end', () => { });
            });

            req.on('error', () => { /* ignore network errors */ });
            req.setTimeout(5000, () => req.abort());
        }, interval);
    } catch (err) {
        // If URL is invalid, fall back to local onboarding ping
        setInterval(() => {
            http.get(`http://localhost:${port}/onboarding`, (res) => {
                res.on('data', () => { });
            }).on('error', () => { });
        }, 5 * 60 * 1000);
    }
});

module.exports = app;

