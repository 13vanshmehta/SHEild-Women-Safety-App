const UserLocation = require('../models/userLocation');
const User = require('../models/user');
const Group = require('../models/group');

// Update user's current location
const updateLocation = async (req, res) => {
  try {
    const { userId } = req.user;
    const { 
      latitude, 
      longitude, 
      accuracy, 
      altitude, 
      speed, 
      heading,
      address,
      batteryLevel,
      isCharging,
      platform,
      osVersion
    } = req.body;

    // Validate coordinates
    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }

    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return res.status(400).json({
        success: false,
        message: 'Invalid coordinates'
      });
    }

    // Get user details
    const user = await User.findById(userId).select('firstName lastName email profilePicture');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update or create location record
    const locationData = {
      userId,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      profilePicture: user.profilePicture,
      currentLocation: {
        latitude,
        longitude,
        accuracy: accuracy || null,
        altitude: altitude || null,
        speed: speed || null,
        heading: heading || null
      },
      address: address || null,
      lastUpdated: new Date(),
      lastActiveAt: new Date(),
      isOnline: true,
      batteryLevel: batteryLevel || null,
      isCharging: isCharging || false,
      deviceInfo: {
        platform: platform || null,
        osVersion: osVersion || null
      }
    };

    const userLocation = await UserLocation.findOneAndUpdate(
      { userId },
      locationData,
      { upsert: true, new: true, runValidators: true }
    );

    // Broadcast location update via Socket.io
    const io = require('../app').io || global.io;
    if (io) {
      // Get user's groups to broadcast to
      const userGroups = await Group.find({
        'members.user': userId,
        'members.isActive': true,
        isActive: true
      }).select('_id');

      // Broadcast to all group rooms
      userGroups.forEach(group => {
        io.to(`group:${group._id}`).emit('userLocationUpdated', {
          userId: userLocation.userId,
          firstName: userLocation.firstName,
          lastName: userLocation.lastName,
          email: userLocation.email,
          profilePicture: userLocation.profilePicture,
          latitude: userLocation.currentLocation.latitude,
          longitude: userLocation.currentLocation.longitude,
          accuracy: userLocation.currentLocation.accuracy,
          address: userLocation.address,
          lastUpdated: userLocation.lastUpdated,
          isOnline: userLocation.isOnline,
          batteryLevel: userLocation.batteryLevel
        });
      });
    }

    res.json({
      success: true,
      message: 'Location updated successfully',
      data: {
        userId: userLocation.userId,
        latitude: userLocation.currentLocation.latitude,
        longitude: userLocation.currentLocation.longitude,
        address: userLocation.address,
        lastUpdated: userLocation.lastUpdated
      }
    });

  } catch (error) {
    console.error('Update location error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update location'
    });
  }
};

// Get all visible user locations (for map)
const getVisibleLocations = async (req, res) => {
  try {
    const { userId } = req.user;

    // Get all locations visible to this user
    const locations = await UserLocation.getVisibleLocations(userId);

    // Filter out stale locations (optional - older than 30 minutes)
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    const activeLocations = locations.filter(loc => loc.lastUpdated > thirtyMinutesAgo);

    // Format response
    const formattedLocations = activeLocations.map(loc => ({
      userId: loc.userId,
      firstName: loc.firstName,
      lastName: loc.lastName,
      fullName: `${loc.firstName} ${loc.lastName}`.trim(),
      email: loc.email,
      profilePicture: loc.profilePicture,
      latitude: loc.currentLocation.latitude,
      longitude: loc.currentLocation.longitude,
      accuracy: loc.currentLocation.accuracy,
      address: loc.address,
      lastUpdated: loc.lastUpdated,
      isOnline: loc.isOnline,
      batteryLevel: loc.batteryLevel,
      isCharging: loc.isCharging
    }));

    res.json({
      success: true,
      data: {
        locations: formattedLocations,
        total: formattedLocations.length
      }
    });

  } catch (error) {
    console.error('Get visible locations error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch locations'
    });
  }
};

// Get specific user location
const getUserLocation = async (req, res) => {
  try {
    const { userId } = req.user;
    const { targetUserId } = req.params;

    const location = await UserLocation.findOne({ userId: targetUserId });

    if (!location) {
      return res.status(404).json({
        success: false,
        message: 'Location not found'
      });
    }

    // Check if requesting user can see this location
    if (!location.canUserSeeLocation(userId)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view this location'
      });
    }

    res.json({
      success: true,
      data: {
        userId: location.userId,
        firstName: location.firstName,
        lastName: location.lastName,
        email: location.email,
        profilePicture: location.profilePicture,
        latitude: location.currentLocation.latitude,
        longitude: location.currentLocation.longitude,
        accuracy: location.currentLocation.accuracy,
        address: location.address,
        lastUpdated: location.lastUpdated,
        isOnline: location.isOnline,
        batteryLevel: location.batteryLevel
      }
    });

  } catch (error) {
    console.error('Get user location error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch location'
    });
  }
};

// Update location sharing settings
const updateSharingSettings = async (req, res) => {
  try {
    const { userId } = req.user;
    const { isLocationVisible, shareWith, visibleToUsers, visibleToGroups } = req.body;

    const location = await UserLocation.findOne({ userId });

    if (!location) {
      return res.status(404).json({
        success: false,
        message: 'Location record not found. Please update your location first.'
      });
    }

    // Update sharing settings
    if (typeof isLocationVisible === 'boolean') {
      location.sharingSettings.isLocationVisible = isLocationVisible;
    }

    if (shareWith && ['everyone', 'groups', 'emergency_contacts', 'nobody'].includes(shareWith)) {
      location.sharingSettings.shareWith = shareWith;
    }

    if (Array.isArray(visibleToUsers)) {
      location.sharingSettings.visibleToUsers = visibleToUsers;
    }

    if (Array.isArray(visibleToGroups)) {
      location.sharingSettings.visibleToGroups = visibleToGroups;
    }

    await location.save();

    res.json({
      success: true,
      message: 'Sharing settings updated successfully',
      data: {
        sharingSettings: location.sharingSettings
      }
    });

  } catch (error) {
    console.error('Update sharing settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update sharing settings'
    });
  }
};

// Update user online status
const updateOnlineStatus = async (req, res) => {
  try {
    const { userId } = req.user;
    const { isOnline } = req.body;

    await UserLocation.findOneAndUpdate(
      { userId },
      { 
        isOnline: isOnline !== undefined ? isOnline : true,
        lastActiveAt: new Date()
      }
    );

    res.json({
      success: true,
      message: 'Online status updated'
    });

  } catch (error) {
    console.error('Update online status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update status'
    });
  }
};

module.exports = {
  updateLocation,
  getVisibleLocations,
  getUserLocation,
  updateSharingSettings,
  updateOnlineStatus
};
