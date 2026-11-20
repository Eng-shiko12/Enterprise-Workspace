const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, default: '' },
    // Human readable identifier, e.g. "COR-12"
    key: { type: String, index: true },
    number: Number,
    status: {
        type: String,
        enum: ['todo', 'in_progress', 'review', 'done'],
        default: 'todo'
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium'
    },
    points: { type: Number, default: 1, min: 0, max: 100 },
    labels: [{ type: String, trim: true, maxlength: 24 }],
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    workSpace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    dueDate: Date,
    completedAt: Date
}, { timestamps: true });

taskSchema.index({ workSpace: 1, project: 1 });
taskSchema.index({ workSpace: 1, status: 1 });

module.exports = mongoose.model('Task', taskSchema);
