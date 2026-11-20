const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', 
        required: true,
        index: true
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    type: {
        type: String, 
        enum: [
            'ASSIGNED_TO_CARD', 'MENTIONED_IN_COMMENT', 'ADDED_TO_WORKSPACE', 'DUE_DATE_APPROACHING',
            'WORKSPACE_INVITE', 'TASK_ASSIGNED', 'TASK_COMMENT'
        ],
        required: true
    },
    link: { type: String, maxlength: 300 },
    targetModel: {
        type: String, 
        enum: ['Card', 'Board', 'Workspace', 'Task', 'Project']
    },
    targetId: {
        type: mongoose.Schema.Types.ObjectId,
        index: true
    },
    message: { 
        type: String
    },
    isRead: {
        type: Boolean, 
        default: false
    }
}, { timestamps: true });

const Notification = mongoose.model('Notification', notificationSchema);
module.exports = Notification;