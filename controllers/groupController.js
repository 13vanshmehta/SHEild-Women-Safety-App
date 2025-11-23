const Group = require('../models/group');
const GroupMessage = require('../models/groupMessage');
const User = require('../models/user');
const { validationResult } = require('express-validator');

// Get all groups for a user
const getUserGroups = async (req, res) => {
  try {
    const { userId } = req.user;
    const { page = 1, limit = 20 } = req.query;

    console.log('Fetching groups for user:', userId);

    const groups = await Group.find({
      'members.user': userId,
      'members.isActive': true,
      isActive: true
    })
      .populate('createdBy', 'firstName lastName email')
      .sort({ isPinned: -1, lastActivity: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-__v -members.user');

    const total = await Group.countDocuments({
      'members.user': userId,
      'members.isActive': true,
      isActive: true
    });

    console.log(`Found ${groups.length} groups for user`);

    // Enrich groups with last message + unread count for this user
    const groupsWithMeta = await Promise.all(
      groups.map(async (group) => {
        const groupId = group._id;

        let lastMessageDoc = null;
        let unreadCount = 0;

        try {
          lastMessageDoc = await GroupMessage.findOne({
            groupId,
            isDeleted: false,
          })
            .sort({ createdAt: -1 })
            .lean();
        } catch (err) {
          console.error('Error fetching last message for group', groupId, err);
        }

        try {
          // Messages that do NOT have this user in readBy
          unreadCount = await GroupMessage.countDocuments({
            groupId,
            isDeleted: false,
            $or: [
              { readBy: { $exists: false } },
              { readBy: { $size: 0 } },
              { readBy: { $not: { $elemMatch: { userId } } } },
            ],
          });
        } catch (err) {
          console.error('Error counting unread messages for group', groupId, err);
          unreadCount = 0;
        }

        const groupObj = group.toObject({ virtuals: true });

        if (lastMessageDoc) {
          let previewText = '';
          if (lastMessageDoc.messageType === 'location') {
            previewText = 'Live location';
          } else if (lastMessageDoc.messageType === 'audio') {
            previewText = 'Audio message';
          } else {
            previewText =
              (lastMessageDoc.content && lastMessageDoc.content.text) || '';
          }

          const isOwn =
            lastMessageDoc.senderId &&
            lastMessageDoc.senderId.toString() === userId.toString();
          const senderName = lastMessageDoc.senderName || 'Someone';
          const senderFirstName = senderName.split(' ')[0] || senderName;

          groupObj.lastMessage = {
            _id: lastMessageDoc._id,
            text: previewText,
            senderId: lastMessageDoc.senderId,
            senderName: lastMessageDoc.senderName,
            isOwn,
            createdAt: lastMessageDoc.createdAt,
            messageType: lastMessageDoc.messageType,
          };

          const prefix = previewText ? (isOwn ? 'You' : senderFirstName) : '';
          groupObj.lastMessagePreview = previewText
            ? `${prefix}: ${previewText}`
            : '';
          groupObj.lastMessageAt = lastMessageDoc.createdAt;
        } else {
          groupObj.lastMessage = null;
          groupObj.lastMessagePreview = 'Start conversation';
          groupObj.lastMessageAt = groupObj.createdAt;
        }

        groupObj.unreadCount = unreadCount;

        return groupObj;
      })
    );

    // Always return success with groups array
    res.json({
      success: true,
      data: {
        groups: groupsWithMeta || [],
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit) || 1,
          total: total || 0,
        },
      },
    });
  } catch (error) {
    console.error('Get user groups error:', error);
    // Return success with empty array to prevent errors
    res.json({
      success: true,
      data: {
        groups: [],
        pagination: {
          current: 1,
          pages: 1,
          total: 0,
        },
      },
    });
  }
};

// Get single group details
const getGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.user;

    const group = await Group.findOne({
      _id: id,
      'members.user': userId,
      'members.isActive': true,
      isActive: true
    })
    .populate('createdBy', 'firstName lastName email')
    .populate('members.user', 'firstName lastName email');

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found or you are not a member'
      });
    }

    res.json({
      success: true,
      data: group
    });
  } catch (error) {
    console.error('Get group error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch group'
    });
  }
};

// Create a new group
const createGroup = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { userId } = req.user;
    const { name, description, members = [], settings = {} } = req.body;

    // Get user details
    const user = await User.findById(userId).select('firstName lastName phoneNumber email');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Create group with creator as admin
    const groupData = {
      name: name.trim(),
      description: description ? description.trim() : '',
      createdBy: userId,
      members: [{
        user: userId,
        phoneNumber: user.phoneNumber || '',
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown',
        role: 'admin',
        joinedAt: new Date(),
        isActive: true
      }],
      settings: {
        allowMemberInvite: true,
        allowFileSharing: true,
        allowLocationSharing: true,
        allowVoiceMessages: true,
        allowVideoMessages: true,
        ...settings
      }
    };

    console.log('Creating group with data:', { name: groupData.name, description: groupData.description });

    const group = new Group(groupData);
    await group.save();

    // Add additional members if provided
    if (members.length > 0) {
      for (const member of members) {
        if (member.userId && member.userId.toString() !== userId.toString()) {
          group.addMember(member.userId, member.phoneNumber, member.name, 'member');
        }
      }
      await group.save();
    }

    await group.populate('createdBy', 'firstName lastName email');
    await group.populate('members.user', 'firstName lastName email');

    console.log('Group created successfully:', group._id);

    res.status(201).json({
      success: true,
      message: 'Group created successfully',
      data: group
    });
  } catch (error) {
    console.error('Create group error:', error);
    res.status(500).json({
      success: false,
      message: `Failed to create group: ${error.message}`
    });
  }
};

// Join group by code
const joinGroup = async (req, res) => {
  try {
    const { joinCode } = req.body;
    const { userId } = req.user;

    const group = await Group.findOne({
      joinCode: joinCode.toUpperCase(),
      isActive: true
    });

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Invalid join code or group not found'
      });
    }

    // Check if user is already a member
    if (group.isMember(userId)) {
      return res.status(400).json({
        success: false,
        message: 'You are already a member of this group'
      });
    }

    // Add user to group
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get user details with fallbacks
    const phoneNumber = user.phoneNumber || '';
    const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'User';
    
    group.addMember(userId, phoneNumber, userName, 'member');
    await group.save();

    await group.populate('createdBy', 'firstName lastName email');
    await group.populate('members.user', 'firstName lastName email');

    res.json({
      success: true,
      message: 'Successfully joined the group',
      data: group
    });
  } catch (error) {
    console.error('Join group error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to join group'
    });
  }
};

// Update basic group details (name, description, image)
const updateGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.user;
    const { name, description, groupImage } = req.body;

    const group = await Group.findOne({
      _id: id,
      'members.user': userId,
      'members.isActive': true,
      isActive: true,
    });

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found or you are not a member',
      });
    }

    // Only admins can edit group details
    if (!group.isAdmin(userId)) {
      return res.status(403).json({
        success: false,
        message: 'Only admins can update group details',
      });
    }

    if (typeof name === 'string' && name.trim()) {
      group.name = name.trim();
    }
    if (typeof description === 'string') {
      group.description = description.trim();
    }
    if (typeof groupImage === 'string') {
      group.groupImage = groupImage.trim();
    }

    group.lastActivity = new Date();
    await group.save();

    res.json({
      success: true,
      message: 'Group updated successfully',
      data: group,
    });
  } catch (error) {
    console.error('Update group error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update group',
    });
  }
};

// Add member to group
const addMember = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { userId } = req.user;
    const { memberId, phoneNumber, name } = req.body;

    const group = await Group.findOne({
      _id: groupId,
      'members.user': userId,
      'members.isActive': true,
      isActive: true
    });

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found or you are not a member'
      });
    }

    // Check if user is admin
    if (!group.isAdmin(userId)) {
      return res.status(403).json({
        success: false,
        message: 'Only admins can add members'
      });
    }

    let userIdToAdd = memberId;

    // If no memberId provided, try to find user by phone number
    if (!userIdToAdd && phoneNumber) {
      const existingUser = await User.findOne({ phoneNumber });
      if (existingUser) {
        userIdToAdd = existingUser._id;
      }
    }

    // Check if member is already in group by userId or phone number
    const existingMember = group.members.find(m => 
      (userIdToAdd && m.user && m.user.toString() === userIdToAdd.toString()) ||
      (phoneNumber && m.phoneNumber === phoneNumber)
    );

    if (existingMember && existingMember.isActive) {
      return res.status(400).json({
        success: false,
        message: 'User is already a member of this group'
      });
    }

    // Reactivate if member exists but inactive
    if (existingMember && !existingMember.isActive) {
      existingMember.isActive = true;
      existingMember.joinedAt = new Date();
      await group.save();
      await group.populate('members.user', 'firstName lastName email');
      
      return res.json({
        success: true,
        message: 'Member re-added successfully',
        data: group
      });
    }

    // Add member (with or without userId)
    group.addMember(userIdToAdd, phoneNumber, name, 'member');
    await group.save();

    await group.populate('members.user', 'firstName lastName email');

    res.json({
      success: true,
      message: 'Member added successfully',
      data: group
    });
  } catch (error) {
    console.error('Add member error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add member'
    });
  }
};

// Remove member from group
const removeMember = async (req, res) => {
  try {
    const { groupId, memberId } = req.params;
    const { userId } = req.user;

    const group = await Group.findOne({
      _id: groupId,
      'members.user': userId,
      'members.isActive': true,
      isActive: true
    });

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found or you are not a member'
      });
    }

    // Check if user is admin or removing themselves
    if (!group.isAdmin(userId) && userId.toString() !== memberId) {
      return res.status(403).json({
        success: false,
        message: 'Only admins can remove other members'
      });
    }

    // Check if trying to remove the last admin
    const adminCount = group.members.filter(member => 
      member.role === 'admin' && member.isActive
    ).length;

    if (adminCount === 1 && group.isAdmin(memberId)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot remove the last admin from the group'
      });
    }

    group.removeMember(memberId);
    await group.save();

    res.json({
      success: true,
      message: 'Member removed successfully'
    });
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove member'
    });
  }
};

// Update group settings
const updateGroupSettings = async (req, res) => {
  try {
    const groupId = req.params.groupId || req.params.id;
    const { userId } = req.user;
    const { settings } = req.body;

    const group = await Group.findOne({
      _id: groupId,
      'members.user': userId,
      'members.isActive': true,
      isActive: true
    });

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found or you are not a member'
      });
    }

    // Check if user is admin
    if (!group.isAdmin(userId)) {
      return res.status(403).json({
        success: false,
        message: 'Only admins can update group settings'
      });
    }

    group.settings = { ...group.settings, ...settings };
    group.lastActivity = new Date();
    await group.save();

    res.json({
      success: true,
      message: 'Group settings updated successfully',
      data: group
    });
  } catch (error) {
    console.error('Update group settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update group settings'
    });
  }
};

// Leave group
const leaveGroup = async (req, res) => {
  try {
    const groupId = req.params.groupId || req.params.id;
    const { userId } = req.user;

    const group = await Group.findOne({
      _id: groupId,
      'members.user': userId,
      'members.isActive': true,
      isActive: true
    });

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found or you are not a member'
      });
    }

    // Check if user is the last admin
    const adminCount = group.members.filter(member => 
      member.role === 'admin' && member.isActive
    ).length;

    if (adminCount === 1 && group.isAdmin(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot leave group as the last admin. Transfer admin role or delete the group.'
      });
    }

    group.removeMember(userId);
    await group.save();

    res.json({
      success: true,
      message: 'Successfully left the group'
    });
  } catch (error) {
    console.error('Leave group error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to leave group'
    });
  }
};

// Pin / unpin group
const pinGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { userId } = req.user;
    const { isPinned } = req.body;

    const group = await Group.findOne({
      _id: groupId,
      'members.user': userId,
      'members.isActive': true,
      isActive: true,
    });

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found or you are not a member',
      });
    }

    group.isPinned = !!isPinned;
    group.lastActivity = new Date();
    await group.save();

    res.json({
      success: true,
      message: isPinned ? 'Group pinned' : 'Group unpinned',
      data: {
        groupId: group._id,
        isPinned: group.isPinned,
      },
    });
  } catch (error) {
    console.error('Pin group error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update pin state',
    });
  }
};

// Mark/unmark group as favorite
const favoriteGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { userId } = req.user;
    const { isFavorite } = req.body;

    const group = await Group.findOne({
      _id: groupId,
      'members.user': userId,
      'members.isActive': true,
      isActive: true,
    });

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found or you are not a member',
      });
    }

    group.isFavorite = !!isFavorite;
    group.lastActivity = new Date();
    await group.save();

    res.json({
      success: true,
      message: isFavorite ? 'Group marked as favorite' : 'Group removed from favorites',
      data: {
        groupId: group._id,
        isFavorite: group.isFavorite,
      },
    });
  } catch (error) {
    console.error('Favorite group error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update favorite state',
    });
  }
};

// Delete group
const deleteGroup = async (req, res) => {
  try {
    const groupId = req.params.groupId || req.params.id;
    const { userId } = req.user;

    const group = await Group.findOne({
      _id: groupId,
      createdBy: userId,
      isActive: true
    });

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found or you are not the creator'
      });
    }

    // Soft delete group
    group.isActive = false;
    await group.save();

    // Soft delete all messages
    await GroupMessage.updateMany(
      { groupId },
      { isDeleted: true, deletedAt: new Date() }
    );

    res.json({
      success: true,
      message: 'Group deleted successfully'
    });
  } catch (error) {
    console.error('Delete group error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete group'
    });
  }
};

// Get messages for a group
const getGroupMessages = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { userId } = req.user;
    const { page = 1, limit = 50 } = req.query;

    console.log('📥 getGroupMessages - groupId:', groupId, 'userId:', userId);

    const group = await Group.findOne({
      _id: groupId,
      'members.user': userId,
      'members.isActive': true,
      isActive: true
    });

    if (!group) {
      console.log('📥 Group not found or user not a member');
      return res.status(404).json({
        success: false,
        message: 'Group not found or you are not a member'
      });
    }

    const query = { groupId, isDeleted: false };
    console.log('📥 Query:', JSON.stringify(query));
    const numericLimit = parseInt(limit) || 50;
    const numericPage = parseInt(page) || 1;

    const total = await GroupMessage.countDocuments(query);
    console.log('📥 Total messages in DB:', total);

    const messages = await GroupMessage.find(query)
      .sort({ createdAt: -1 }) // Newest first
      .limit(numericLimit)
      .skip((numericPage - 1) * numericLimit);

    console.log('📥 Found', messages.length, 'messages (sorted newest first, then reversed for display)');
    if (messages.length > 0) {
      console.log('📥 First message:', {
        _id: messages[0]._id,
        text: messages[0].content?.text,
        type: messages[0].messageType,
        senderId: messages[0].senderId
      });
    }

    // Mark all fetched messages as read for this user
    try {
      await Promise.all(
        messages.map(async (msg) => {
          const alreadyRead =
            Array.isArray(msg.readBy) &&
            msg.readBy.some((r) =>
              r.userId && r.userId.toString() === userId.toString()
            );

          if (!alreadyRead) {
            msg.markAsRead(userId);
            await msg.save();
          }
        })
      );
    } catch (markErr) {
      console.error('Error marking group messages as read:', markErr);
    }

    // Reverse so oldest messages are first in the array (for chat display)
    const formattedMessages = messages.reverse().map((msg) => ({
      _id: msg._id,
      groupId: msg.groupId,
      text: (msg.content && msg.content.text) || '',
      messageType: msg.messageType,
      mediaUrl: msg.content && msg.content.mediaUrl,
      // Include mediaData (base64) - stored in DB for persistence across devices
      // Frontend will handle lazy loading to save bandwidth
      mediaData: msg.content && msg.content.mediaData,
      hasMediaData: !!(msg.content && msg.content.mediaData), // Flag to show download icon
      location: msg.content && msg.content.location,
      duration: msg.content && msg.content.duration,
      sender: {
        _id: msg.senderId,
        name: msg.senderName || 'Unknown',
      },
      timestamp: msg.createdAt,
      isOwn: msg.senderId.toString() === userId.toString(),
    }));

    res.json({
      success: true,
      data: {
        messages: formattedMessages,
        pagination: {
          current: numericPage,
          pages: Math.ceil(total / numericLimit) || 1,
          total: total || 0,
        },
      },
    });
  } catch (error) {
    console.error('Get group messages error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch group messages'
    });
  }
};

// Get media data for a specific message (on-demand download)
const getMessageMedia = async (req, res) => {
  try {
    const { groupId, messageId } = req.params;
    const { userId } = req.user;

    // Verify user is a member of the group
    const group = await Group.findOne({
      _id: groupId,
      'members.user': userId,
      'members.isActive': true,
      isActive: true
    });

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found or you are not a member'
      });
    }

    // Get the message with media data
    const message = await GroupMessage.findOne({
      _id: messageId,
      groupId: groupId,
      isDeleted: false
    });

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    if (!message.content || !message.content.mediaData) {
      console.log(`No media data for message ${messageId} - likely an old message before blob storage`);
      return res.status(404).json({
        success: false,
        message: 'No media data available for this message',
        isOldMessage: true // Flag to indicate this is an old message
      });
    }

    res.json({
      success: true,
      data: {
        messageId: message._id,
        mediaData: message.content.mediaData,
        messageType: message.messageType
      }
    });
  } catch (error) {
    console.error('Get message media error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch media data'
    });
  }
};

// Edit a single group message (currently text-only)
const editGroupMessage = async (req, res) => {
  try {
    const { groupId, messageId } = req.params;
    const { userId } = req.user;
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Updated message text is required',
      });
    }

    const group = await Group.findOne({
      _id: groupId,
      'members.user': userId,
      'members.isActive': true,
      isActive: true,
    });

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found or you are not a member',
      });
    }

    const message = await GroupMessage.findOne({ _id: messageId, groupId, isDeleted: false });

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found',
      });
    }

    // Only sender can edit the message
    if (message.senderId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only edit your own messages',
      });
    }

    // Only allow editing text messages for now
    if (message.messageType !== 'text') {
      return res.status(400).json({
        success: false,
        message: 'Only text messages can be edited',
      });
    }

    message.editMessage(text.trim());
    await message.save();

    res.json({
      success: true,
      message: 'Message updated successfully',
      data: {
        _id: message._id,
        groupId: message.groupId,
        text: message.content.text,
        messageType: message.messageType,
        mediaUrl: message.content.mediaUrl,
        location: message.content.location,
        duration: message.content.duration,
        senderId: message.senderId,
        senderName: message.senderName,
        createdAt: message.createdAt,
        updatedAt: message.updatedAt,
      },
    });
  } catch (error) {
    console.error('Edit group message error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to edit message',
    });
  }
};

// Delete (soft-delete) a single group message
const deleteGroupMessage = async (req, res) => {
  try {
    const { groupId, messageId } = req.params;
    const { userId } = req.user;

    const group = await Group.findOne({
      _id: groupId,
      'members.user': userId,
      'members.isActive': true,
      isActive: true,
    });

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found or you are not a member',
      });
    }

    const message = await GroupMessage.findOne({ _id: messageId, groupId, isDeleted: false });

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found',
      });
    }

    const isSender = message.senderId.toString() === userId.toString();
    const isAdmin = group.isAdmin(userId);

    if (!isSender && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own messages',
      });
    }

    message.softDelete();
    await message.save();

    res.json({
      success: true,
      message: 'Message deleted successfully',
    });
  } catch (error) {
    console.error('Delete group message error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete message',
    });
  }
};

// Upload media (audio/image) for a group
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const mediaStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', 'uploads', 'group-media');
    fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    let ext = path.extname(file.originalname);
    
    // If no extension, try to get it from mimetype
    if (!ext && file.mimetype) {
      const mimeToExt = {
        'image/jpeg': '.jpg',
        'image/jpg': '.jpg',
        'image/png': '.png',
        'image/gif': '.gif',
        'image/webp': '.webp',
        'audio/mpeg': '.mp3',
        'audio/mp4': '.m4a',
        'audio/aac': '.aac',
      };
      ext = mimeToExt[file.mimetype] || '.jpg';
    }
    
    // Fallback to .jpg if still no extension
    if (!ext) {
      ext = '.jpg';
    }
    
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${unique}${ext}`);
  },
});

const mediaUpload = multer({ 
  storage: mediaStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  }
});

const uploadGroupMedia = [
  mediaUpload.single('file'),
  async (req, res) => {
    try {
      const { groupId } = req.params;
      const { userId } = req.user;
      const { fileType } = req.body; // 'audio' or 'image'

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded',
        });
      }

      if (!['audio', 'image'].includes(fileType)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid file type',
        });
      }

      const group = await Group.findOne({
        _id: groupId,
        'members.user': userId,
        'members.isActive': true,
        isActive: true,
      });

      if (!group) {
        return res.status(404).json({
          success: false,
          message: 'Group not found or you are not a member',
        });
      }

      // For images, convert to base64 and store as blob
      let mediaUrl = null;
      let mediaData = null;

      if (fileType === 'image') {
        // Read the uploaded file and convert to base64
        const filePath = req.file.path;
        const fileBuffer = fs.readFileSync(filePath);
        const base64Data = fileBuffer.toString('base64');
        const mimeType = req.file.mimetype || 'image/jpeg';
        
        // Create data URI
        mediaData = `data:${mimeType};base64,${base64Data}`;
        
        // Delete the temporary file since we're storing as blob
        fs.unlinkSync(filePath);
        
        console.log(`Image converted to base64 blob (${Math.round(base64Data.length / 1024)}KB)`);
      } else {
        // For audio files, keep file-based storage
        const relativePath = `/uploads/group-media/${req.file.filename}`;
        const baseUrl = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;
        mediaUrl = `${baseUrl}${relativePath}`;
      }

      res.status(201).json({
        success: true,
        message: 'Media uploaded successfully',
        data: {
          mediaUrl,
          mediaData,
          fileType,
        },
      });
    } catch (error) {
      console.error('Upload group media error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to upload media',
      });
    }
  },
];

module.exports = {
  getUserGroups,
  getGroup,
  createGroup,
  joinGroup,
  updateGroup,
  addMember,
  removeMember,
  updateGroupSettings,
  leaveGroup,
  deleteGroup,
  getGroupMessages,
  getMessageMedia,
  pinGroup,
  favoriteGroup,
  editGroupMessage,
  deleteGroupMessage,
  uploadGroupMedia,
};
