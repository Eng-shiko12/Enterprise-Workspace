const mongoose = require('mongoose');

const listSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
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
    isArchived: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

const List = mongoose.model('List', listSchema);
module.exports = List;