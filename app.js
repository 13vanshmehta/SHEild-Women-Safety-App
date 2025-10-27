const express = require('express')
const app = express()

const port = process.env.PORT || 8000;
const dotenv = require("dotenv");
dotenv.config();
const cors = require("cors");
const passport = require('passport');

const connection = require("./utilities/connection");
connection();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000" || "http://localhost:8081",
    credentials: true
}));
app.use(passport.initialize());

// Routes
const authRoutes = require('./routers/auth');
const googleAuthRoutes = require('./routers/googleAuth');
const emergencyContactRoutes = require('./routers/emergencyContacts');
const groupRoutes = require('./routers/groups');

app.use('/api/auth', authRoutes);
app.use('/api/auth', googleAuthRoutes);
app.use('/api/emergency-contacts', emergencyContactRoutes);
app.use('/api/groups', groupRoutes);

const http = require("http");
const { Server } = require("socket.io");

app.get('/onbaording', (req, res) => {
  try {
    res.send('Server is Working!')
  } catch (error) {
    res.status(500).send('Error: ' + error.message)
  }
})

// Test endpoint for authentication
app.get('/api/test', (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Backend API is working!',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error: ' + error.message
    })
  }
})

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
});

server.listen(port, () => {
  connection;
  if (process.env.NODE_ENV !== "test") {
    console.log("Server running on " + port);
  }
});

module.exports = app;