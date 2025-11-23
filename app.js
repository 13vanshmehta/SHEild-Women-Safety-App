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
app.use(express.json({ limit: '10mb' })); // Increase limit for base64 images
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(cors({
    origin: true, // Allow all origins for development
    credentials: true
}));
app.use(passport.initialize());

// Routes
const authRoutes = require('./routers/auth');
const googleAuthRoutes = require('./routers/googleAuth');
const emergencyContactRoutes = require('./routers/emergencyContacts');
const groupRoutes = require('./routers/groups');
const sosRoutes = require('./routers/sos');
const locationRoutes = require('./routers/location');

app.use('/api/auth', authRoutes);
app.use('/api/auth', googleAuthRoutes);
app.use('/api/emergency-contacts', emergencyContactRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/sos', sosRoutes);
app.use('/api/location', locationRoutes);

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
global.io = io;

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

      let { text, messageType, mediaUrl, mediaData, location, duration } = payload;
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
        // Media messages (audio/image) can have mediaUrl, mediaData (base64), or text
        if (mediaUrl && typeof mediaUrl === 'string') {
          content.mediaUrl = mediaUrl;
        }
        // Store base64 image data in DB for persistence across devices
        if (mediaData && typeof mediaData === 'string') {
          content.mediaData = mediaData;
        }
        if (finalType === 'audio') {
          if (typeof duration === 'number') {
            content.duration = duration;
          }
          // Allow text for audio placeholder messages
          if (text && text.trim()) {
            content.text = text.trim();
          }
        }
        // For image, either mediaUrl or mediaData is required
        if (finalType === 'image' && !mediaUrl && !mediaData) {
          return;
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

      console.log('💾 Saving message:', {
        _id: messageDoc._id,
        groupId: messageDoc.groupId,
        text: messageDoc.content?.text,
        messageType: messageDoc.messageType,
        senderId: messageDoc.senderId
      });

      await messageDoc.save();
      console.log('✅ Message saved successfully');

      group.lastActivity = new Date();
      await group.save();

      const basePayload = {
        _id: messageDoc._id,
        groupId,
        text: messageDoc.content.text || '',
        messageType: messageDoc.messageType,
        mediaUrl: messageDoc.content.mediaUrl,
        mediaData: messageDoc.content.mediaData, // Include base64 data for images
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
