const express = require('express');
const router = express.Router();
const { getNotifications, createNotification, deleteNotification, deleteAllNotifications } = require('../controllers/notificationsController');

router.get('/', getNotifications);
router.post('/create', createNotification);
router.delete('/delete/:notificationId', deleteNotification);
router.delete('/delete_all/:userId', deleteAllNotifications);

module.exports = router;