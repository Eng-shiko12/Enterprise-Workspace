const Notification = require('../models/notificationModel');
const { emitToUser } = require('../sockets/socketHandler');

/**
 * Persist an in-app notification and push it to the recipient in real time.
 * Never throws — a failed notification must not break the originating request.
 */
const notify = async ({ recipient, sender, type, message, targetModel, targetId, link }) => {
    try {
        if (!recipient || recipient.toString() === sender.toString()) return null;
        const notification = await Notification.create({ recipient, sender, type, message, targetModel, targetId, link });
        await notification.populate('sender', 'name avatar');
        emitToUser(recipient, 'notification', notification);
        return notification;
    } catch (err) {
        console.error('Notification error:', err.message);
        return null;
    }
};

module.exports = notify;
