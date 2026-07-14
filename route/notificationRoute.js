const express = require('express');
const router = express.Router();
const {
  sendNotification,
  getUserNotifications,
  markRead,
  markUnread,
  softDeleteByUser,
  hardDeleteByAdmin,
} = require('../controller/notificationController');

router.post('/send', sendNotification); // admin
router.get('/:userId', getUserNotifications);
router.post('/:id/mark-read', markRead);
router.post('/:id/mark-unread', markUnread);
router.post('/:id/soft-delete', softDeleteByUser);
router.delete('/:id', hardDeleteByAdmin); // admin permanent delete

module.exports = router;
