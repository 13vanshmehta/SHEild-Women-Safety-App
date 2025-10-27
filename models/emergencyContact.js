const mongoose = require('mongoose');

const emergencyContactSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  phoneNumber: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  relationship: {
    type: String,
    enum: ['family', 'friend', 'colleague', 'neighbor', 'other'],
    default: 'friend'
  },
  isPrimary: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  addedFrom: {
    type: String,
    enum: ['contact_book', 'manual', 'imported'],
    default: 'manual'
  },
  contactImage: {
    type: String,
    default: null
  },
  notes: {
    type: String,
    maxlength: 500
  },
  lastContacted: {
    type: Date,
    default: null
  },
  emergencyPriority: {
    type: Number,
    min: 1,
    max: 5,
    default: 3
  }
}, {
  timestamps: true
});

// Index for efficient queries
emergencyContactSchema.index({ userId: 1, isActive: 1 });
emergencyContactSchema.index({ phoneNumber: 1 });

// Ensure only one primary contact per user
emergencyContactSchema.pre('save', async function(next) {
  if (this.isPrimary && this.isModified('isPrimary')) {
    await this.constructor.updateMany(
      { userId: this.userId, _id: { $ne: this._id } },
      { isPrimary: false }
    );
  }
  next();
});

// Virtual for formatted phone number
emergencyContactSchema.virtual('formattedPhoneNumber').get(function() {
  // Simple formatting - can be enhanced based on country
  const phone = this.phoneNumber.replace(/\D/g, '');
  if (phone.length === 10) {
    return `(${phone.slice(0, 3)}) ${phone.slice(3, 6)}-${phone.slice(6)}`;
  }
  return this.phoneNumber;
});

module.exports = mongoose.model('EmergencyContact', emergencyContactSchema);
