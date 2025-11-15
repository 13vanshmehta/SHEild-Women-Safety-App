const express = require('express')
const app = express()

const port = process.env.PORT || 8000;
const dotenv = require("dotenv");
dotenv.config();
const cors = require("cors");
const passport = require('passport');
const path = require('path');

const connection = require("./utilities/connection");
connection();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
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
const jwt = require("jsonwebtoken");
const User = require("./models/user");
const Group = require("./models/group");
const GroupMessage = require("./models/groupMessage");

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

// Make socket.io instance available in controllers
app.set('io', io);

// Socket.io authentication middleware
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth && socket.handshake.auth.token;

    if (!token) {
      return next(new Error('Authentication error'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('firstName lastName email');

    if (!user) {
      return next(new Error('Authentication error'));
    }

    socket.user = {
      userId: user._id,
      name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown',
    };

    next();
  } catch (error) {
    console.error('Socket auth error:', error);
    next(new Error('Authentication error'));
  }
});

// Socket.io events for group chat
io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);

  socket.on('joinGroup', async ({ groupId }) => {
    try {
      if (!groupId || !socket.user) {
        return socket.emit('groupError', { groupId, message: 'Invalid group or user' });
      }

      const { userId } = socket.user;

      const group = await Group.findOne({
        _id: groupId,
        'members.user': userId,
        'members.isActive': true,
        isActive: true,
      });

      if (!group) {
        return socket.emit('groupError', { groupId, message: 'Group not found or access denied' });
      }

      socket.join(`group:${groupId}`);
      socket.emit('groupJoined', { groupId });
    } catch (error) {
      console.error('joinGroup error:', error);
      socket.emit('groupError', { groupId, message: 'Failed to join group' });
    }
  });

  socket.on('leaveGroup', ({ groupId }) => {
    if (groupId) {
      socket.leave(`group:${groupId}`);
    }
  });

  socket.on('sendGroupMessage', async (payload) => {
    try {
      const { groupId } = payload || {};
      if (!groupId || !socket.user) {
        return;
      }

      const { userId, name } = socket.user;

      const group = await Group.findOne({
        _id: groupId,
        'members.user': userId,
        'members.isActive': true,
        isActive: true,
      });

      if (!group) {
        return socket.emit('groupError', { groupId, message: 'Group not found or access denied' });
      }

      let { text, messageType, mediaUrl, location, duration } = payload;
      let finalType = messageType || 'text';
      const content = {};

      if (finalType === 'location') {
        if (!location || typeof location.latitude !== 'number' || typeof location.longitude !== 'number') {
          return;
        }
        content.location = {
          latitude: location.latitude,
          longitude: location.longitude,
          address: location.address || '',
          isLive: !!location.isLive,
        };
      } else if (finalType === 'audio' || finalType === 'image') {
        // Media messages (audio/image) expect a previously uploaded file and mediaUrl
        if (!mediaUrl || typeof mediaUrl !== 'string') {
          return;
        }
        content.mediaUrl = mediaUrl;
        if (finalType === 'audio' && typeof duration === 'number') {
          content.duration = duration;
        }
      } else {
        if (!text || !text.trim()) {
          return;
        }
        content.text = text.trim();
        finalType = 'text';
      }

      const messageDoc = new GroupMessage({
        groupId,
        senderId: userId,
        senderName: name,
        messageType: finalType,
        content,
      });

      await messageDoc.save();

      group.lastActivity = new Date();
      await group.save();

      const basePayload = {
        _id: messageDoc._id,
        groupId,
        text: messageDoc.content.text || '',
        messageType: messageDoc.messageType,
        mediaUrl: messageDoc.content.mediaUrl,
        location: messageDoc.content.location,
        duration: messageDoc.content.duration,
        sender: {
          _id: userId,
          name,
        },
        timestamp: messageDoc.createdAt,
      };

      // Send to sender
      socket.emit('messageSent', { ...basePayload, isOwn: true });

      // Broadcast to other group members
      socket.broadcast.to(`group:${groupId}`).emit('groupMessage', {
        ...basePayload,
        isOwn: false,
      });
    } catch (error) {
      console.error('sendGroupMessage error:', error);
      const groupId = (payload && payload.groupId) || undefined;
      socket.emit('groupError', { groupId, message: 'Failed to send message' });
    }
  });

  socket.on('disconnect', () => {
    console.log('Socket disconnected:', socket.id);
  });
});

server.listen(port, () => {
  if (process.env.NODE_ENV !== "test") {
    console.log("Server running on " + port);
  }
});

module.exports = app;
