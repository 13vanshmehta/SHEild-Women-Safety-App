const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const User = require("../models/user");
const Group = require("../models/group");
const GroupMessage = require("../models/groupMessage");

const initSocket = (server) => {
  const io = new Server(server, {
    cors: { origin: "*" },
  });

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

  // Socket.io events
  io.on('connection', async (socket) => {
    console.log('Socket connected');
    
    // Set user as online when connected
    if (socket.user && socket.user.userId) {
      try {
        const UserLocation = require("../models/userLocation");
        await UserLocation.findOneAndUpdate(
          { userId: socket.user.userId },
          { isOnline: true, lastActiveAt: new Date() }
        );
      } catch (err) {
        console.error('Error setting user online:', err);
      }
    }

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
          if (mediaUrl && typeof mediaUrl === 'string') {
            content.mediaUrl = mediaUrl;
          }
          if (mediaData && typeof mediaData === 'string') {
            content.mediaData = mediaData;
          }
          if (finalType === 'audio') {
            if (typeof duration === 'number') {
              content.duration = duration;
            }
            if (text && text.trim()) {
              content.text = text.trim();
            }
          }
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

        await messageDoc.save();

        group.lastActivity = new Date();
        await group.save();

        const basePayload = {
          _id: messageDoc._id,
          groupId,
          text: messageDoc.content.text || '',
          messageType: messageDoc.messageType,
          mediaUrl: messageDoc.content.mediaUrl,
          mediaData: messageDoc.content.mediaData,
          location: messageDoc.content.location,
          duration: messageDoc.content.duration,
          sender: {
            _id: userId,
            name,
          },
          timestamp: messageDoc.createdAt,
        };

        socket.emit('messageSent', { ...basePayload, isOwn: true });
        socket.broadcast.to(`group:${groupId}`).emit('groupMessage', {
          ...basePayload,
          isOwn: false,
        });

        // --- Push Notification Integration ---
        try {
          const { sendToGroup } = require('./notificationService');
          
          // Get group name for the notification
          const groupName = group.name || 'Group Chat';
          
          // Determine notification body based on message type
          let body = '';
          if (finalType === 'text') {
            body = text.length > 100 ? `${text.substring(0, 97)}...` : text;
          } else if (finalType === 'image') {
            body = '📷 Photo';
          } else if (finalType === 'audio') {
            body = '🎵 Audio message';
          } else if (finalType === 'location') {
            body = '📍 Location shared';
          } else {
            body = `New ${finalType} message`;
          }

          // Send push notifications to group members (except sender)
          await sendToGroup(groupId, userId, {
            title: `${name} @ ${groupName}`,
            body,
            data: {
              groupId: groupId.toString(),
              senderId: userId.toString(),
              type: 'group_message',
              messageId: messageDoc._id.toString()
            }
          });
        } catch (notifyError) {
          // Log but don't fail the message send if notification fails
          console.error('Failed to send push notification:', notifyError);
        }
      } catch (error) {

        console.error('sendGroupMessage error:', error);
        const groupId = (payload && payload.groupId) || undefined;
        socket.emit('groupError', { groupId, message: 'Failed to send message' });
      }
    });

    socket.on('disconnect', async () => {
      console.log('Socket disconnected');
      // Set user as offline when disconnected
      if (socket.user && socket.user.userId) {
        try {
          const UserLocation = require("../models/userLocation");
          await UserLocation.findOneAndUpdate(
            { userId: socket.user.userId },
            { isOnline: false, lastActiveAt: new Date() }
          );
        } catch (err) {
          console.error('Error setting user offline:', err);
        }
      }
    });
  });

  return io;
};

module.exports = initSocket;
