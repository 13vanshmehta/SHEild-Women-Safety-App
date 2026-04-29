const mongoose = require('mongoose');

const userLocationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true // One location record per user
  },
  firstName: {
    type: String,
    required: true
  },
  lastName: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  profilePicture: {
    type: String,
    default: null
  },
  currentLocation: {
    latitude: {
      type: Number,
      required: true,
      min: -90,
      max: 90
    },
    longitude: {
      type: Number,
      required: true,
      min: -180,
      max: 180
    },
    accuracy: {
      type: Number, // Accuracy in meters
      default: null
    },
    altitude: {
      type: Number,
      default: null
    },
    speed: {
      type: Number, // Speed in m/s
      default: null
    },
    heading: {
      type: Number, // Direction in degrees
      default: null
    }
  },
  address: {
    type: String,
    default: null
  },
  // Privacy & Sharing Settings
  sharingSettings: {
    isLocationVisible: {
      type: Boolean,
      default: true // User can toggle location visibility
    },
    shareWith: {
      type: String,
      enum: ['everyone', 'groups', 'emergency_contacts', 'nobody'],
      default: 'groups' // Share with group members by default
    },
    // Specific users who can see this location
    visibleToUsers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    // Specific groups that can see this location
    visibleToGroups: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group'
    }]
  },
  // Activity tracking
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  lastActiveAt: {
    type: Date,
    default: Date.now
  },
  isOnline: {
    type: Boolean,
    default: false
  },
  // Battery info (useful for safety)
  batteryLevel: {
    type: Number,
    min: 0,
    max: 100,
    default: null
  },
  isCharging: {
    type: Boolean,
    default: false
  },
  // Device info
  deviceInfo: {
    platform: {
      type: String,
      enum: ['ios', 'android', 'web'],
      default: null
    },
    osVersion: {
      type: String,
      default: null
    }
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
userLocationSchema.index({ 'currentLocation.latitude': 1, 'currentLocation.longitude': 1 });
userLocationSchema.index({ 'sharingSettings.isLocationVisible': 1 });
userLocationSchema.index({ lastUpdated: -1 });
userLocationSchema.index({ isOnline: 1 });

// Virtual for full name
userLocationSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`.trim();
});

// Method to check if location is stale (older than 5 minutes)
userLocationSchema.methods.isLocationStale = function() {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  return this.lastUpdated < fiveMinutesAgo;
};

// Method to check if user can see this location
userLocationSchema.methods.canUserSeeLocation = function(requestingUserId) {
  // If location is not visible, nobody can see it
  if (!this.sharingSettings.isLocationVisible) {
    return false;
  }

  const shareWith = this.sharingSettings.shareWith;
  
  // If sharing with everyone
  if (shareWith === 'everyone') {
    return true;
  }

  // If not sharing at all
  if (shareWith === 'nobody') {
    return false;
  }

  // Check if specifically visible to this user
  if (this.sharingSettings.visibleToUsers && 
      this.sharingSettings.visibleToUsers.some(id => id.toString() === requestingUserId.toString())) {
    return true;
  }

  return false;
};

// Static method to get visible locations for a user
userLocationSchema.statics.getVisibleLocations = async function(requestingUserId) {
  const User = mongoose.model('User');
  const Group = mongoose.model('Group');
  
  // Get user's groups to determine who they can see
  const userGroups = await Group.find({
    'members.user': requestingUserId,
    'members.isActive': true,
    isActive: true
  }).select('_id members');

  // Get all member IDs from user's groups
  const groupMemberIds = new Set();
  userGroups.forEach(group => {
    group.members.forEach(member => {
      if (member.isActive && member.user.toString() !== requestingUserId.toString()) {
        groupMemberIds.add(member.user.toString());
      }
    });
  });

  // Find locations that are visible
  const locations = await this.find({
    userId: { $ne: requestingUserId }, // Exclude requesting user
    'sharingSettings.isLocationVisible': true,
    $or: [
      { 'sharingSettings.shareWith': 'everyone' },
      { 
        'sharingSettings.shareWith': 'groups',
        userId: { $in: Array.from(groupMemberIds) }
      },
      {
        'sharingSettings.visibleToUsers': requestingUserId
      }
    ]
  }).select('-sharingSettings.visibleToUsers -sharingSettings.visibleToGroups');

  return locations;
};

// Update lastUpdated before saving
userLocationSchema.pre('save', function(next) {
  this.lastUpdated = new Date();
  next();
});

module.exports = mongoose.model('UserLocation', userLocationSchema);
