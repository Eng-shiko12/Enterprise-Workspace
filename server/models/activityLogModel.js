const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
    workSpace: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Workspace',
        required: true,
        index: true
    },
    board: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Board',
        index: true
    },
    card: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Card',
        index: true
    },
    actor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    actionType: {
        type: String,
        required: true
    },
    details: {
        type: mongoose.Schema.Types.Mixed       
    }
}, { timestamps: true });

const ActivityLog = mongoose.model('ActivityLog', activitySchema);
module.exports = ActivityLog;