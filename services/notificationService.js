const admin = require('firebase-admin');
const path = require('path');
const User = require('../models/user');

// Initialize Firebase Admin
// Note: In production, you should place your service account key in the config folder
// and set the path in your .env file or hardcode it if necessary for now.
try {
  // Use environment variables for security instead of a hardcoded JSON file
  const privateKey = process.env.FIREBASE_PRIVATE_KEY 
    ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') 
    : undefined;

  if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && privateKey) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey,
      }),
    });
    console.log('Firebase Admin initialized successfully using environment variables');
  } else {
    // Fallback for local development if file exists (but still recommended to use .env)
    const serviceAccount = require('../config/firebase-service-account.json');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('Firebase Admin initialized using config file');
  }
} catch (error) {
  console.error('Firebase Admin initialization failed. Please set FIREBASE_* variables in your .env file.');
}


/**
 * Send a notification to a specific user
 * @param {string} userId - ID of the user to notify
 * @param {object} notification - Notification object { title, body, data }
 */
const sendToUser = async (userId, { title, body, data = {} }) => {
  try {
    const user = await User.findById(userId).select('fcmToken notificationSettings');
    
    if (!user || !user.fcmToken || !user.notificationSettings.allEnabled) {
      return null;
    }

    const message = {
      notification: { title, body },
      data: {
        ...data,
        click_action: 'FLUTTER_NOTIFICATION_CLICK', // For legacy compatibility
      },
      token: user.fcmToken
    };

    const response = await admin.messaging().send(message);
    return response;
  } catch (error) {
    console.error(`Error sending notification to user ${userId}:`, error);
    return null;
  }
};

/**
 * Send a notification to multiple users
 * @param {Array<string>} userIds - Array of user IDs to notify
 * @param {object} notification - Notification object { title, body, data }
 */
const sendToMultipleUsers = async (userIds, { title, body, data = {} }) => {
  try {
    const users = await User.find({
      _id: { $in: userIds },
      fcmToken: { $ne: null },
      'notificationSettings.allEnabled': true
    }).select('fcmToken');

    const tokens = users.map(u => u.fcmToken);
    
    if (tokens.length === 0) return null;

    const message = {
      notification: { title, body },
      data: data,
      tokens: tokens
    };

    const response = await admin.messaging().sendMulticast(message);
    return response;
  } catch (error) {
    console.error('Error sending multicast notifications:', error);
    return null;
  }
};

/**
 * Send a notification to all members of a group except the sender
 * @param {string} groupId - ID of the group
 * @param {string} senderId - ID of the sender (to be excluded)
 * @param {object} notification - Notification object { title, body, data }
 */
const sendToGroup = async (groupId, senderId, { title, body, data = {} }) => {
  try {
    const Group = require('../models/group');
    const group = await Group.findById(groupId).populate('members.user', 'fcmToken notificationSettings');
    
    if (!group) return null;

    const tokens = group.members
      .filter(m => 
        m.user && 
        m.user._id.toString() !== senderId.toString() && 
        m.user.fcmToken && 
        m.user.notificationSettings.allEnabled &&
        m.user.notificationSettings.groupMessages
      )
      .map(m => m.user.fcmToken);

    if (tokens.length === 0) return null;

    // Send in batches of 500 (FCM limit)
    const batches = [];
    for (let i = 0; i < tokens.length; i += 500) {
      const batchTokens = tokens.slice(i, i + 500);
      const message = {
        notification: { title, body },
        data: {
          ...data,
          groupId: groupId.toString(),
          type: 'group_chat'
        },
        tokens: batchTokens
      };
      batches.push(admin.messaging().sendEachForMulticast(message));
    }

    const results = await Promise.all(batches);
    return results;
  } catch (error) {
    console.error(`Error sending group notification for group ${groupId}:`, error);
    return null;
  }
};

module.exports = {
  sendToUser,
  sendToMultipleUsers,
  sendToGroup
};
