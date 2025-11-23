const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const groupController = require('../controllers/groupController');
const { authenticateToken } = require('../middleware/auth');

// Validation rules
const createGroupValidation = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Group name is required and must be less than 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters'),
  body('members')
    .optional()
    .isArray()
    .withMessage('Members must be an array'),
  body('members.*.userId')
    .optional()
    .isMongoId()
    .withMessage('Invalid member user ID'),
  body('members.*.phoneNumber')
    .optional()
    .trim()
    .isLength({ min: 10, max: 15 })
    .withMessage('Invalid phone number'),
  body('members.*.name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Invalid member name'),
  body('settings.allowMemberInvite')
    .optional()
    .isBoolean()
    .withMessage('Allow member invite must be boolean'),
  body('settings.allowFileSharing')
    .optional()
    .isBoolean()
    .withMessage('Allow file sharing must be boolean'),
  body('settings.allowLocationSharing')
    .optional()
    .isBoolean()
    .withMessage('Allow location sharing must be boolean'),
  body('settings.allowVoiceMessages')
    .optional()
    .isBoolean()
    .withMessage('Allow voice messages must be boolean'),
  body('settings.allowVideoMessages')
    .optional()
    .isBoolean()
    .withMessage('Allow video messages must be boolean')
];

const joinGroupValidation = [
  body('joinCode')
    .trim()
    .isLength({ min: 6, max: 15 })
    .withMessage('Join code must be between 6-15 characters')
    .matches(/^[A-Z0-9-]+$/)
    .withMessage('Join code must contain only uppercase letters, numbers, and hyphens')
];

const addMemberValidation = [
  param('groupId')
    .isMongoId()
    .withMessage('Invalid group ID'),
  body('memberId')
    .optional()
    .isMongoId()
    .withMessage('Invalid member ID'),
  body('phoneNumber')
    .trim()
    .isLength({ min: 10, max: 15 })
    .withMessage('Phone number must be between 10-15 characters'),
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Name is required and must be less than 100 characters')
];

const updateSettingsValidation = [
  param('groupId')
    .isMongoId()
    .withMessage('Invalid group ID'),
  body('settings.allowMemberInvite')
    .optional()
    .isBoolean()
    .withMessage('Allow member invite must be boolean'),
  body('settings.allowFileSharing')
    .optional()
    .isBoolean()
    .withMessage('Allow file sharing must be boolean'),
  body('settings.allowLocationSharing')
    .optional()
    .isBoolean()
    .withMessage('Allow location sharing must be boolean'),
  body('settings.allowVoiceMessages')
    .optional()
    .isBoolean()
    .withMessage('Allow voice messages must be boolean'),
  body('settings.allowVideoMessages')
    .optional()
    .isBoolean()
    .withMessage('Allow video messages must be boolean')
];

// Apply authentication middleware to all routes
router.use(authenticateToken);

// GET /api/groups - Get all groups for user
router.get('/', 
  [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1-100')
  ],
  groupController.getUserGroups
);

// GET /api/groups/:groupId/messages - Get messages for a group
router.get('/:groupId/messages',
  [
    param('groupId')
      .isMongoId()
      .withMessage('Invalid group ID'),
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1-100')
  ],
  groupController.getGroupMessages
);

// GET /api/groups/:groupId/messages/:messageId/media - Get media data for a message (on-demand)
router.get('/:groupId/messages/:messageId/media',
  [
    param('groupId')
      .isMongoId()
      .withMessage('Invalid group ID'),
    param('messageId')
      .isMongoId()
      .withMessage('Invalid message ID'),
  ],
  groupController.getMessageMedia
);

// PUT /api/groups/:groupId/messages/:messageId - Edit a message (text only)
router.put('/:groupId/messages/:messageId',
  [
    param('groupId')
      .isMongoId()
      .withMessage('Invalid group ID'),
    param('messageId')
      .isMongoId()
      .withMessage('Invalid message ID'),
    body('text')
      .trim()
      .isLength({ min: 1, max: 2000 })
      .withMessage('Message text must be between 1 and 2000 characters'),
  ],
  groupController.editGroupMessage
);

// DELETE /api/groups/:groupId/messages/:messageId - Delete a message
router.delete('/:groupId/messages/:messageId',
  [
    param('groupId')
      .isMongoId()
      .withMessage('Invalid group ID'),
    param('messageId')
      .isMongoId()
      .withMessage('Invalid message ID'),
  ],
  groupController.deleteGroupMessage
);

// GET /api/groups/:id - Get single group
router.get('/:id',
  [
    param('id')
      .isMongoId()
      .withMessage('Invalid group ID')
  ],
  groupController.getGroup
);

// POST /api/groups - Create new group
router.post('/', createGroupValidation, groupController.createGroup);

// PUT /api/groups/:id - Update group basic details
router.put('/:id',
  [
    param('id')
      .isMongoId()
      .withMessage('Invalid group ID'),
    body('name')
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Group name must be between 1 and 100 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Description must be less than 500 characters'),
    body('groupImage')
      .optional()
      .isString()
      .withMessage('Group image must be a string URL'),
  ],
  groupController.updateGroup
);

// POST /api/groups/join - Join group by code
router.post('/join', joinGroupValidation, groupController.joinGroup);

// POST /api/groups/:groupId/members - Add member to group
router.post('/:groupId/members', addMemberValidation, groupController.addMember);

// PATCH /api/groups/:groupId/pin - Pin/unpin group
router.patch('/:groupId/pin',
  [
    param('groupId')
      .isMongoId()
      .withMessage('Invalid group ID'),
  ],
  groupController.pinGroup
);

// DELETE /api/groups/:groupId/members/:memberId - Remove member from group
router.delete('/:groupId/members/:memberId',
  [
    param('groupId')
      .isMongoId()
      .withMessage('Invalid group ID'),
    param('memberId')
      .isMongoId()
      .withMessage('Invalid member ID')
  ],
  groupController.removeMember
);

// PUT /api/groups/:id/settings - Update group settings
router.put('/:id/settings', updateSettingsValidation, groupController.updateGroupSettings);

// PATCH /api/groups/:groupId/favorite - Favorite/unfavorite group
router.patch('/:groupId/favorite',
  [
    param('groupId')
      .isMongoId()
      .withMessage('Invalid group ID'),
  ],
  groupController.favoriteGroup
);

// POST /api/groups/:id/leave - Leave group
router.post('/:id/leave',
  [
    param('id')
      .isMongoId()
      .withMessage('Invalid group ID')
  ],
  groupController.leaveGroup
);

// DELETE /api/groups/:id - Delete group
router.delete('/:id',
  [
    param('id')
      .isMongoId()
      .withMessage('Invalid group ID')
  ],
  groupController.deleteGroup
);

// POST /api/groups/:groupId/media - Upload group media (audio/image)
router.post(
  '/:groupId/media',
  [
    param('groupId')
      .isMongoId()
      .withMessage('Invalid group ID'),
  ],
  groupController.uploadGroupMedia
);

module.exports = router;
