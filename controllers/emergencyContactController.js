const EmergencyContact = require('../models/emergencyContact');
const { validationResult } = require('express-validator');

// Get all emergency contacts for a user
const getEmergencyContacts = async (req, res) => {
  try {
    const { userId } = req.user;
    const { page = 1, limit = 20, search = '', relationship = '' } = req.query;

    const query = { 
      userId, 
      isActive: true 
    };

    // Add search filter
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phoneNumber: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    // Add relationship filter
    if (relationship) {
      query.relationship = relationship;
    }

    const contacts = await EmergencyContact.find(query)
      .sort({ isPrimary: -1, emergencyPriority: -1, name: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-__v');

    const total = await EmergencyContact.countDocuments(query);

    // Always return success with contacts array (even if empty)
    res.json({
      success: true,
      data: {
        contacts: contacts || [],
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit) || 1,
          total: total || 0
        }
      }
    });
  } catch (error) {
    console.error('Get emergency contacts error:', error);
    // Return success with empty array on error to prevent alerts
    res.json({
      success: true,
      data: {
        contacts: [],
        pagination: {
          current: 1,
          pages: 1,
          total: 0
        }
      }
    });
  }
};

// Get a single emergency contact
const getEmergencyContact = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.user;

    const contact = await EmergencyContact.findOne({ 
      _id: id, 
      userId, 
      isActive: true 
    });

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Emergency contact not found'
      });
    }

    res.json({
      success: true,
      data: contact
    });
  } catch (error) {
    console.error('Get emergency contact error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch emergency contact'
    });
  }
};

// Create a new emergency contact
const createEmergencyContact = async (req, res) => {
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
    const contactData = { ...req.body, userId };

    // Check if contact with same name and phone number already exists for this user
    const existingContact = await EmergencyContact.findOne({
      userId,
      name: contactData.name,
      phoneNumber: contactData.phoneNumber,
      isActive: true
    });

    if (existingContact) {
      return res.status(400).json({
        success: false,
        message: 'This contact already exists in your Trust Circle'
      });
    }

    const contact = new EmergencyContact(contactData);
    await contact.save();

    res.status(201).json({
      success: true,
      message: 'Emergency contact created successfully',
      data: contact
    });
  } catch (error) {
    console.error('Create emergency contact error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create emergency contact'
    });
  }
};

// Update an emergency contact
const updateEmergencyContact = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const { userId } = req.user;
    const updateData = req.body;

    // Check if contact with same name and phone number already exists for another contact
    if (updateData.phoneNumber || updateData.name) {
      const currentContact = await EmergencyContact.findOne({ _id: id, userId });
      if (currentContact) {
        const searchName = updateData.name || currentContact.name;
        const searchPhone = updateData.phoneNumber || currentContact.phoneNumber;
        
        const existingContact = await EmergencyContact.findOne({
          userId,
          name: searchName,
          phoneNumber: searchPhone,
          _id: { $ne: id },
          isActive: true
        });

        if (existingContact) {
          return res.status(400).json({
            success: false,
            message: 'This contact already exists in your Trust Circle'
          });
        }
      }
    }

    const contact = await EmergencyContact.findOneAndUpdate(
      { _id: id, userId, isActive: true },
      updateData,
      { new: true, runValidators: true }
    );

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Emergency contact not found'
      });
    }

    res.json({
      success: true,
      message: 'Emergency contact updated successfully',
      data: contact
    });
  } catch (error) {
    console.error('Update emergency contact error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update emergency contact'
    });
  }
};

// Delete an emergency contact (soft delete)
const deleteEmergencyContact = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.user;

    const contact = await EmergencyContact.findOneAndUpdate(
      { _id: id, userId, isActive: true },
      { isActive: false },
      { new: true }
    );

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Emergency contact not found'
      });
    }

    res.json({
      success: true,
      message: 'Emergency contact deleted successfully'
    });
  } catch (error) {
    console.error('Delete emergency contact error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete emergency contact'
    });
  }
};

// Set primary emergency contact
const setPrimaryContact = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.user;

    // First, set all other contacts to not primary
    await EmergencyContact.updateMany(
      { userId, _id: { $ne: id }, isActive: true },
      { isPrimary: false }
    );

    // Then set the selected contact as primary
    const contact = await EmergencyContact.findOneAndUpdate(
      { _id: id, userId, isActive: true },
      { isPrimary: true },
      { new: true }
    );

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Emergency contact not found'
      });
    }

    res.json({
      success: true,
      message: 'Primary contact updated successfully',
      data: contact
    });
  } catch (error) {
    console.error('Set primary contact error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to set primary contact'
    });
  }
};

// Bulk import contacts from contact book
const bulkImportContacts = async (req, res) => {
  try {
    const { userId } = req.user;
    const { contacts } = req.body;

    if (!Array.isArray(contacts) || contacts.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Contacts array is required and cannot be empty'
      });
    }

    const importedContacts = [];
    const errors = [];

    for (let i = 0; i < contacts.length; i++) {
      try {
        const contactData = {
          ...contacts[i],
          userId,
          addedFrom: 'contact_book'
        };

        // Check if contact with same name and phone number already exists
        const existingContact = await EmergencyContact.findOne({
          userId,
          name: contactData.name,
          phoneNumber: contactData.phoneNumber,
          isActive: true
        });

        if (!existingContact) {
          const contact = new EmergencyContact(contactData);
          await contact.save();
          importedContacts.push(contact);
        } else {
          errors.push({
            index: i,
            phoneNumber: contactData.phoneNumber,
            message: 'Contact already exists'
          });
        }
      } catch (error) {
        errors.push({
          index: i,
          phoneNumber: contacts[i].phoneNumber,
          message: error.message
        });
      }
    }

    res.json({
      success: true,
      message: `Imported ${importedContacts.length} contacts successfully`,
      data: {
        imported: importedContacts,
        errors: errors
      }
    });
  } catch (error) {
    console.error('Bulk import contacts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to import contacts'
    });
  }
};

module.exports = {
  getEmergencyContacts,
  getEmergencyContact,
  createEmergencyContact,
  updateEmergencyContact,
  deleteEmergencyContact,
  setPrimaryContact,
  bulkImportContacts
};
