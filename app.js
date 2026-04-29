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
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: {
        success: false,
        message: 'Too many requests from this IP, please try again after 15 minutes'
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
});

module.exports = app;
