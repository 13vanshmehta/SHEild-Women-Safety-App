const mongoose = require('mongoose');

const groupMessageSchema = new mongoose.Schema({
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  senderName: {
    type: String,
    required: true
  },
  messageType: {
    type: String,
    enum: ['text', 'image', 'video', 'audio', 'file', 'document', 'location', 'voice_note'],
    default: 'text'
  },
  content: {
    text: {
      type: String,
      maxlength: 2000
    },
    mediaUrl: {
      type: String
    },
    mediaData: {
      type: String // Base64 encoded image data for blob storage
    },
    fileName: {
      type: String
    },
    fileSize: {
      type: Number
    },
    mimeType: {
      type: String
    },
    location: {
      latitude: {
        type: Number
      },
      longitude: {
        type: Number
      },
      address: {
        type: String
      },
      isLive: {
        type: Boolean,
        default: false
      }
    },
    duration: {
      type: Number // For audio/video messages
    }
  },
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GroupMessage',
    default: null
  },
  isEdited: {
    type: Boolean,
    default: false
  },
  editedAt: {
    type: Date,
    default: null
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date,
    default: null
  },
  readBy: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }],
  reactions: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    emoji: {
      type: String,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  isPinned: {
    type: Boolean,
    default: false
  },
  pinnedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
groupMessageSchema.index({ groupId: 1, createdAt: -1 });
groupMessageSchema.index({ senderId: 1 });
groupMessageSchema.index({ 'readBy.userId': 1 });
groupMessageSchema.index({ isDeleted: 1, isEdited: 1 });

// Virtual for read count
groupMessageSchema.virtual('readCount').get(function() {
  return this.readBy.length;
});

// Virtual for reaction count
groupMessageSchema.virtual('reactionCount').get(function() {
  return this.reactions.length;
});

// Method to mark as read by user
groupMessageSchema.methods.markAsRead = function(userId) {
  const existingRead = this.readBy.find(read => 
    read.userId.toString() === userId.toString()
  );
  
  if (!existingRead) {
    this.readBy.push({
      userId,
      readAt: new Date()
    });
  }
  
  return this;
};

// Method to add reaction
groupMessageSchema.methods.addReaction = function(userId, emoji) {
  // Remove existing reaction from this user
  this.reactions = this.reactions.filter(reaction => 
    reaction.userId.toString() !== userId.toString()
  );
  
  // Add new reaction
  this.reactions.push({
    userId,
    emoji,
    createdAt: new Date()
  });
  
  return this;
};

// Method to remove reaction
groupMessageSchema.methods.removeReaction = function(userId) {
  this.reactions = this.reactions.filter(reaction => 
    reaction.userId.toString() !== userId.toString()
  );
  
  return this;
};

// Method to soft delete message
groupMessageSchema.methods.softDelete = function() {
  this.isDeleted = true;
  this.deletedAt = new Date();
  return this;
};

// Method to edit message
groupMessageSchema.methods.editMessage = function(newContent) {
  this.content.text = newContent;
  this.isEdited = true;
  this.editedAt = new Date();
  return this;
};

module.exports = mongoose.model('GroupMessage', groupMessageSchema);
