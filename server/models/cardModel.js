const mongoose = require('mongoose');

const cardSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        default: ''
    },
    list: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'List', 
        required: true,
        index: true
    },
    board: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Board',
        required: true,
        index: true
    },
    order: {
        type: Number,
        required: true
    },
    priority: { 
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium' 
    },
    dueDate: {
        type: Date
    },
    startDate: {
        type: Date 
    },
    isArchived: {
        type: Boolean,
        default: false
    },
    isCompleted: { 
        type: Boolean,
        default: false
    },
    assignedTo: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    }],
    labels: [{
        name: {
            type: String
        },
        color: {
            type: String
        }
    }],
    checklists: [{
        title: {
            type: String,
            required: true
        },
        items: [{
            text: {
                type: String,
                required: true
            },
            isCompleted: {
                type: Boolean,
                default: false
            }
        }]
    }],
    attachments: [{
        name: {
            type: String
        },
        url: {
            type: String
        },
        uploadedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User' 
        },
        createdAt: {
            type: Date, 
            default: Date.now
        }
    }]
}, { timestamps: true });

cardSchema.index({ list: 1, order: 1 });

const Card = mongoose.model('Card', cardSchema);
module.exports = Card;