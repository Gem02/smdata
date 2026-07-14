const Notification = require('../models/Notification');
const User = require('../models/User');

const sendNotification = async (req, res) => {
  try {
    const { title, message, userIds = [], targetAll = false } = req.body;
    const adminUserId = req.params.adminUserId;

    if (!adminUserId) {
      return res.status(400).json({ message: 'adminUserId is required' });
    }

    if (!title || !message) {
      return res.status(400).json({ message: 'title and message are required' });
    }

    if (!targetAll && (!Array.isArray(userIds) || userIds.length === 0)) {
      return res.status(400).json({ message: 'Provide userIds or set targetAll to true' });
    }

    const notification = await Notification.create({
      title,
      message,
      targetAll: Boolean(targetAll),
      recipients: targetAll ? [] : userIds,
      createdBy: adminUserId,
    });

    return res.status(201).json({ message: 'Notification sent', notification });
  } catch (error) {
    console.error('sendNotification error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

const getUserNotifications = async (req, res) => {
  try {
    const userId = req.params.userId || req.user?._id;

    if (!userId) {
      return res.status(400).json({ message: 'userId is required' });
    }

    const user = await User.findById(userId).select('_id createdAt');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const notifications = await Notification.find({
      $or: [
        { targetAll: true, createdAt: { $gte: user.createdAt } },
        { recipients: user._id }
      ],
      deletedBy: { $ne: user._id }
    }).sort({ createdAt: -1 });

    const result = notifications.map(n => ({
      id: n._id,
      title: n.title,
      message: n.message,
      createdAt: n.createdAt,
      isRead: n.readBy.some(r => r.toString() === user._id.toString()),
    }));

    return res.status(200).json({ data: result });
  } catch (error) {
    console.error('getUserNotifications error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

const markRead = async (req, res) => {
  try {
    const notificationId = req.params.id;
    const userId = req.params.userId || req.user?._id;

    if (!userId) {
      return res.status(400).json({ message: 'userId is required' });
    }

    await Notification.findByIdAndUpdate(notificationId, { $addToSet: { readBy: userId } });
    return res.status(200).json({ message: 'Marked as read' });
  } catch (error) {
    console.error('markRead error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

const markUnread = async (req, res) => {
  try {
    const notificationId = req.params.id;
    const userId = req.params.userId || req.user?._id;

    if (!userId) {
      return res.status(400).json({ message: 'userId is required' });
    }

    await Notification.findByIdAndUpdate(notificationId, { $pull: { readBy: userId } });
    return res.status(200).json({ message: 'Marked as unread' });
  } catch (error) {
    console.error('markUnread error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

const softDeleteByUser = async (req, res) => {
  try {
    const notificationId = req.params.id;
    const userId = req.params.userId || req.user?._id;

    if (!userId) {
      return res.status(400).json({ message: 'userId is required' });
    }

    await Notification.findByIdAndUpdate(notificationId, { $addToSet: { deletedBy: userId } });
    return res.status(200).json({ message: 'Notification deleted (soft) for user' });
  } catch (error) {
    console.error('softDeleteByUser error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

const hardDeleteByAdmin = async (req, res) => {
  try {
    const notificationId = req.params.id;
    const adminUserId = req.params.adminUserId;

    if (!adminUserId) {
      return res.status(400).json({ message: 'adminUserId is required' });
    }

    await Notification.findByIdAndDelete(notificationId);
    return res.status(200).json({ message: 'Notification permanently deleted' });
  } catch (error) {
    console.error('hardDeleteByAdmin error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  sendNotification,
  getUserNotifications,
  markRead,
  markUnread,
  softDeleteByUser,
  hardDeleteByAdmin,
};
