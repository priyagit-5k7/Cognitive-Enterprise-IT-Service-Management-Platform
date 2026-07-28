/**
 * notificationController.js — Full CRUD notification controller (Phase 7)
 */

const NotificationModel = require('../models/notificationModel');

exports.getUserNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const { unreadOnly = 'false', limit = 50, page = 1 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, parseInt(limit, 10));
    const offset = (pageNum - 1) * limitNum;

    const notifications = await NotificationModel.findByUser(userId, {
      unreadOnly: unreadOnly === 'true',
      limit: limitNum,
      offset
    });
    const unreadCount = await NotificationModel.countUnread(userId);

    res.json({ notifications, unreadCount, page: pageNum, limit: limitNum });
  } catch (err) {
    console.error('[NotificationController] getUserNotifications:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.getUnreadCount = async (req, res) => {
  try {
    const count = await NotificationModel.countUnread(req.user.id);
    res.json({ count });
  } catch (err) {
    console.error('[NotificationController] getUnreadCount:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await NotificationModel.markRead(id, req.user.id);
    if (!result) return res.status(404).json({ message: 'Notification not found' });
    res.json({ message: 'Notification marked as read' });
  } catch (err) {
    console.error('[NotificationController] markAsRead:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.markAllAsRead = async (req, res) => {
  try {
    const count = await NotificationModel.markAllRead(req.user.id);
    res.json({ message: `${count} notifications marked as read` });
  } catch (err) {
    console.error('[NotificationController] markAllAsRead:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await NotificationModel.delete(id, req.user.id);
    if (!deleted) return res.status(404).json({ message: 'Notification not found' });
    res.json({ message: 'Notification deleted' });
  } catch (err) {
    console.error('[NotificationController] deleteNotification:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.clearAll = async (req, res) => {
  try {
    const count = await NotificationModel.deleteAll(req.user.id);
    res.json({ message: `${count} notifications cleared` });
  } catch (err) {
    console.error('[NotificationController] clearAll:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};
