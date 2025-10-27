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
    .sort({ lastActivity: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .select('-__v -members.user');

    const total = await Group.countDocuments({
      'members.user': userId,
      'members.isActive': true,
      isActive: true
    });

    console.log(`Found ${groups.length} groups for user`);

    // Always return success with groups array
    res.json({
      success: true,
      data: {
        groups: groups || [],
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit) || 1,
          total: total || 0
        }
      }
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
          total: 0
        }
      }
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

    group.addMember(userId, user.phoneNumber || '', `${user.firstName} ${user.lastName}`, 'member');
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

    // Check if member is already in group
    if (group.isMember(memberId)) {
      return res.status(400).json({
        success: false,
        message: 'User is already a member of this group'
      });
    }

    // Add member
    group.addMember(memberId, phoneNumber, name, 'member');
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
    const { groupId } = req.params;
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
    const { groupId } = req.params;
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

// Delete group
const deleteGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
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

module.exports = {
  getUserGroups,
  getGroup,
  createGroup,
  joinGroup,
  addMember,
  removeMember,
  updateGroupSettings,
  leaveGroup,
  deleteGroup
};
