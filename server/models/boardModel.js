const mongoose = require('mongoose');

const boardSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        default: ''
    },
    workSpace: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Workspace',
        required: true,
        index: true
    },
    background: {
        type: String,
        default: ''
    },
    isArchived: {
        type: Boolean,
        default: false
    },
    isPrivate: {
        type: Boolean,
        default: true
    },
    members: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        role: {
            type: String,
            enum: ['editor', 'viewer'],
            default: 'viewer'
        }
    }]
}, { timestamps: true });

const Board = mongoose.model("Board", boardSchema);
module.exports = Board;