const express = require('express');
const router = express.Router();
const { verifyAdmin, verifyUserParam } = require('../middleware/adminMiddleware');
const {
  sendNotification,
  getUserNotifications,
  markRead,
  markUnread,
  softDeleteByUser,
  hardDeleteByAdmin,
} = require('../controller/notificationController');

router.post('/send/:adminUserId', verifyAdmin, sendNotification);
router.get('/:userId', verifyUserParam, getUserNotifications);
router.post('/:id/mark-read/:userId', verifyUserParam, markRead);
router.post('/:id/mark-unread/:userId', verifyUserParam, markUnread);
router.post('/:id/soft-delete/:userId', verifyUserParam, softDeleteByUser);
router.delete('/:id/:adminUserId', verifyAdmin, hardDeleteByAdmin);

module.exports = router;
