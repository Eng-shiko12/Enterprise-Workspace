const express = require('express');
const { getMyNotifications, markAsRead, markAllAsRead } = require('../controllers/notificationController');
const Auth = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(Auth);

router.patch('/mark-all-read', markAllAsRead);
router.patch('/:notificationId/read', markAsRead);
router.get('/', getMyNotifications);

module.exports = router;
