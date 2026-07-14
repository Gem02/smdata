const express = require('express');
const router = express.Router();
const {
  verifyToken,
  verifyAdmin,
} = require('../middleware/authMiddleware');
const {
  sendNotification,
  getUserNotifications,
  markRead,
  markUnread,
  softDeleteByUser,
  hardDeleteByAdmin,
} = require('../controller/notificationController');

router.post('/send', verifyToken, verifyAdmin, sendNotification);
router.get('/', verifyToken, getUserNotifications);
router.post('/:id/mark-read', verifyToken, markRead);
router.post('/:id/mark-unread', verifyToken, markUnread);
router.post('/:id/soft-delete', verifyToken, softDeleteByUser);
router.delete('/:id', verifyToken, verifyAdmin, hardDeleteByAdmin);

module.exports = router;
