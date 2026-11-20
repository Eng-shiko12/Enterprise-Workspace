const Notification = require('../models/notificationModel');
const asyncHandler = require('../utils/asyncHandler');
const createError = require('../utils/AppError');
const sendResponse = require('../utils/sendResponse');

const getMyNotifications = asyncHandler(async (req, res, next) => {
    const notifications = await Notification.find({ recipient: req.user._id })
        .populate('sender', 'name avatar')
        .sort('-createdAt')
        .limit(50);

    const unreadCount = await Notification.countDocuments({
        recipient: req.user._id,
        isRead: false
    });

    sendResponse(res, 200, true, 'Notifications fetched successfully', { notifications, unreadCount });
});

const markAsRead = asyncHandler(async (req, res, next) => {
    const { notificationId } = req.params;

    const notification = await Notification.findOneAndUpdate(
        { _id: notificationId, recipient: req.user._id },
        { isRead: true },
        { new: true }
    );

    if (!notification) {
        return next(createError('Notification not found', 404));
    }

    sendResponse(res, 200, true, 'Notification marked as read', { notification });
});

const markAllAsRead = asyncHandler(async (req, res, next) => {
    await Notification.updateMany(
        { recipient: req.user._id, isRead: false },
        { isRead: true }
    );

    sendResponse(res, 200, true, 'All notifications marked as read');
});

module.exports = {
    getMyNotifications,
    markAsRead,
    markAllAsRead
};
