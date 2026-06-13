const express = require('express');
const router = express.Router();
const { createMessage, getMessage, updateMessage, deleteMessage } = require('../controller/messageController');
const {  verifySuperAdmin } = require('../middleware/adminMiddleware');

// Create a new message
router.post('/', createMessage);

// Get  message
router.get('/', getMessage);

// Update message
router.put('/:adminUserId', verifySuperAdmin, updateMessage);

// Delete message
router.delete('/:adminUserId/:messageId', verifySuperAdmin, deleteMessage);

module.exports = router;