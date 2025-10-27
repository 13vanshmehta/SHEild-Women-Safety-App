const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const emergencyContactController = require('../controllers/emergencyContactController');
const { authenticateToken } = require('../middleware/auth');

// Validation rules
const createContactValidation = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Name is required and must be less than 100 characters'),
  body('phoneNumber')
    .trim()
    .isLength({ min: 10, max: 15 })
    .withMessage('Phone number must be between 10-15 characters')
    .matches(/^[\+]?[1-9][\d]{0,15}$/)
    .withMessage('Invalid phone number format'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Invalid email format'),
  body('relationship')
    .optional()
    .isIn(['family', 'friend', 'colleague', 'neighbor', 'other'])
    .withMessage('Invalid relationship type'),
  body('emergencyPriority')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Emergency priority must be between 1-5'),
  body('notes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Notes must be less than 500 characters')
];

const updateContactValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid contact ID'),
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Name must be less than 100 characters'),
  body('phoneNumber')
    .optional()
    .trim()
    .isLength({ min: 10, max: 15 })
    .withMessage('Phone number must be between 10-15 characters')
    .matches(/^[\+]?[1-9][\d]{0,15}$/)
    .withMessage('Invalid phone number format'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Invalid email format'),
  body('relationship')
    .optional()
    .isIn(['family', 'friend', 'colleague', 'neighbor', 'other'])
    .withMessage('Invalid relationship type'),
  body('emergencyPriority')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Emergency priority must be between 1-5'),
  body('notes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Notes must be less than 500 characters')
];

const bulkImportValidation = [
  body('contacts')
    .isArray({ min: 1 })
    .withMessage('Contacts must be a non-empty array'),
  body('contacts.*.name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Each contact must have a valid name'),
  body('contacts.*.phoneNumber')
    .trim()
    .isLength({ min: 10, max: 15 })
    .withMessage('Each contact must have a valid phone number')
    .matches(/^[\+]?[1-9][\d]{0,15}$/)
    .withMessage('Invalid phone number format'),
  body('contacts.*.email')
    .optional()
    .isEmail()
    .withMessage('Invalid email format'),
  body('contacts.*.relationship')
    .optional()
    .isIn(['family', 'friend', 'colleague', 'neighbor', 'other'])
    .withMessage('Invalid relationship type')
];

// Apply authentication middleware to all routes
router.use(authenticateToken);

// GET /api/emergency-contacts - Get all emergency contacts
router.get('/', 
  [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1-100'),
    query('search')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Search term must be less than 100 characters'),
    query('relationship')
      .optional()
      .isIn(['family', 'friend', 'colleague', 'neighbor', 'other'])
      .withMessage('Invalid relationship filter')
  ],
  emergencyContactController.getEmergencyContacts
);

// GET /api/emergency-contacts/:id - Get single emergency contact
router.get('/:id',
  [
    param('id')
      .isMongoId()
      .withMessage('Invalid contact ID')
  ],
  emergencyContactController.getEmergencyContact
);

// POST /api/emergency-contacts - Create new emergency contact
router.post('/', createContactValidation, emergencyContactController.createEmergencyContact);

// PUT /api/emergency-contacts/:id - Update emergency contact
router.put('/:id', updateContactValidation, emergencyContactController.updateEmergencyContact);

// DELETE /api/emergency-contacts/:id - Delete emergency contact
router.delete('/:id',
  [
    param('id')
      .isMongoId()
      .withMessage('Invalid contact ID')
  ],
  emergencyContactController.deleteEmergencyContact
);

// PUT /api/emergency-contacts/:id/primary - Set as primary contact
router.put('/:id/primary',
  [
    param('id')
      .isMongoId()
      .withMessage('Invalid contact ID')
  ],
  emergencyContactController.setPrimaryContact
);

// POST /api/emergency-contacts/bulk-import - Bulk import contacts
router.post('/bulk-import', bulkImportValidation, emergencyContactController.bulkImportContacts);

module.exports = router;
