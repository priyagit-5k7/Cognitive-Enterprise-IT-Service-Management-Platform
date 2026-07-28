const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const authenticate = require('../middlewares/authMiddleware');

router.use(authenticate);

router.get('/', notificationController.getUserNotifications);
router.get('/count', notificationController.getUnreadCount);
router.put('/mark-all-read', notificationController.markAllAsRead);
router.delete('/clear-all', notificationController.clearAll);
router.put('/:id/read', notificationController.markAsRead);
router.delete('/:id', notificationController.deleteNotification);

module.exports = router;
