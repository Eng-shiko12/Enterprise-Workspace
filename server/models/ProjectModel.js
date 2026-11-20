const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, default: '' },
    status: {
        type: String,
        enum: ['planning', 'active', 'completed'],
        default: 'planning'
    },
    // Short prefix used to build issue keys (e.g. "COR" -> COR-12)
    key: { type: String, uppercase: true, trim: true },
    taskCounter: { type: Number, default: 0 },
    startDate: Date,
    endDate: Date,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    workSpace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true }
}, { timestamps: true });

projectSchema.index({ workSpace: 1, status: 1 });

module.exports = mongoose.model('Project', projectSchema);
