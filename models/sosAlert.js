const mongoose = require('mongoose');

const sosAlertSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  userName: {
    type: String,
    required: true
  },
  userPhone: {
    type: String,
    required: true
  },
  triggerTime: {
    type: Date,
    default: Date.now,
    required: true
  },
  triggerMode: {
    type: String,
    enum: ['manual_button', 'voice_detection', 'voice_keyword', 'fall_detection', 'shake_detection', 'long_press', 'double_press'],
    default: 'manual_button'
  },
  location: {
    latitude: {
      type: Number,
      required: true
    },
    longitude: {
      type: Number,
      required: true
    },
    address: {
      type: String,
      default: ''
    },
    accuracy: {
      type: Number,
      default: 0
    }
  },
  deviceInfo: {
    batteryLevel: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    networkStatus: {
      type: String,
      enum: ['strong', 'moderate', 'weak', 'offline', 'unknown'],
      default: 'unknown'
    },
    deviceModel: {
      type: String,
      default: ''
    },
    osVersion: {
      type: String,
      default: ''
    }
  },
  status: {
    type: String,
    enum: ['triggered', 'sent', 'failed', 'cancelled', 'resolved'],
    default: 'triggered'
  },
  notificationsSent: [{
    recipientType: {
      type: String,
      enum: ['emergency_contact', 'group']
    },
    recipientId: {
      type: mongoose.Schema.Types.ObjectId
    },
    recipientName: {
      type: String
    },
    recipientPhone: {
      type: String
    },
    smsStatus: {
      type: String,
      enum: ['pending', 'sent', 'failed', 'delivered'],
      default: 'pending'
    },
    whatsappStatus: {
      type: String,
      enum: ['pending', 'sent', 'failed', 'delivered'],
      default: 'pending'
    },
    smsSid: String,
    whatsappSid: String,
    sentAt: Date,
    error: String
  }],
  locationUpdates: [{
    latitude: Number,
    longitude: Number,
    address: String,
    timestamp: {
      type: Date,
      default: Date.now
    },
    isOffline: {
      type: Boolean,
      default: false
    },
    notificationSent: {
      type: Boolean,
      default: false
    }
  }],
  lastNotifiedStatus: {
    type: String,
    enum: ['online', 'offline', null],
    default: null
  },
  resolvedAt: Date,
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  notes: String
}, {
  timestamps: true
});

// Indexes for efficient queries
sosAlertSchema.index({ userId: 1, status: 1 });
sosAlertSchema.index({ triggerTime: -1 });
sosAlertSchema.index({ status: 1, createdAt: -1 });

// Method to add location update
sosAlertSchema.methods.addLocationUpdate = function (latitude, longitude, address = '', isOffline = false) {
  this.locationUpdates.push({
    latitude,
    longitude,
    address,
    timestamp: new Date(),
    isOffline
  });

  // Update main location if online
  if (!isOffline) {
    this.location.latitude = latitude;
    this.location.longitude = longitude;
    if (address) {
      this.location.address = address;
    }
  }
};

module.exports = mongoose.model('SOSAlert', sosAlertSchema);
