const Comment = require('../models/commentModel');
const Task = require('../models/taskModel');
const asyncHandler = require('../utils/asyncHandler');
const createError = require('../utils/AppError');
const sendResponse = require('../utils/sendResponse');
const notify = require('../utils/notify');
const Logger = require('../utils/activityLogger');
const { emitToWorkspace } = require('../sockets/socketHandler');

const AUTHOR_FIELDS = 'name email avatar';

const addComment = asyncHandler(async (req, res, next) => {
    const task = await Task.findOne({ _id: req.params.taskId, workSpace: req.workSpace._id });
    if (!task) return next(createError('Task not found in this workspace', 404));

    const comment = await Comment.create({ content: req.body.content, task: task._id, user: req.user._id });
    await comment.populate('user', AUTHOR_FIELDS);

    // Tell the people who care about this task (assignee + reporter), never the author
    const audience = new Set([task.assignedTo?.toString(), task.createdBy?.toString()].filter(Boolean));
    await Promise.all([...audience].map((recipient) => notify({
        recipient,
        sender: req.user._id,
        type: 'TASK_COMMENT',
        message: `${req.user.name} commented on ${task.key || 'a task'}: ${task.title}`,
        targetModel: 'Task',
        targetId: task._id,
        link: `/workspaces/${req.workSpace._id}/tasks/${task.project}/${task._id}`
    })));
    await Logger({ workSpaceId: req.workSpace._id, actorId: req.user._id, actionType: 'ADD_COMMENT', details: { key: task.key, title: task.title } });

    emitToWorkspace(req.workSpace._id, 'commentAdded', { taskId: task._id, comment, actor: req.user._id });
    sendResponse(res, 201, true, 'Comment added successfully', { comment });
});

const getTaskComments = asyncHandler(async (req, res, next) => {
    const task = await Task.findOne({ _id: req.params.taskId, workSpace: req.workSpace._id }).select('_id');
    if (!task) return next(createError('Task not found', 404));

    const comments = await Comment.find({ task: task._id }).populate('user', AUTHOR_FIELDS).sort({ createdAt: -1 });
    sendResponse(res, 200, true, 'Comments fetched successfully', { comments });
});

// Loads a comment and makes sure it belongs to the workspace in the URL
const loadComment = async (req) => {
    const comment = await Comment.findById(req.params.commentId);
    if (!comment) throw createError('Comment not found', 404);
    const task = await Task.findOne({ _id: comment.task, workSpace: req.workSpace._id }).select('_id');
    if (!task) throw createError('Comment not found', 404);
    return comment;
};

const updateComment = asyncHandler(async (req, res, next) => {
    const comment = await loadComment(req);
    if (comment.user.toString() !== req.user._id.toString()) {
        return next(createError('You can only edit your own comments', 403));
    }
    comment.content = req.body.content;
    comment.isEdited = true;
    await comment.save();
    await comment.populate('user', AUTHOR_FIELDS);

    emitToWorkspace(req.workSpace._id, 'commentUpdated', { taskId: comment.task, comment, actor: req.user._id });
    sendResponse(res, 200, true, 'Comment updated successfully', { comment });
});

const deleteComment = asyncHandler(async (req, res, next) => {
    const comment = await loadComment(req);
    const isStaff = ['owner', 'admin'].includes(req.memberRole);
    if (comment.user.toString() !== req.user._id.toString() && !isStaff) {
        return next(createError('You are not allowed to delete this comment', 403));
    }
    await comment.deleteOne();

    emitToWorkspace(req.workSpace._id, 'commentDeleted', { taskId: comment.task, commentId: comment._id, actor: req.user._id });
    sendResponse(res, 200, true, 'Comment deleted successfully');
});

module.exports = { addComment, getTaskComments, updateComment, deleteComment };
