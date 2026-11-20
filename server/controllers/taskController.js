const Task = require('../models/taskModel');
const Project = require('../models/ProjectModel');
const createError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const sendResponse = require('../utils/sendResponse');
const notify = require('../utils/notify');
const Logger = require('../utils/activityLogger');
const escapeRegex = require('../utils/escapeRegex');
const { emitToWorkspace } = require('../sockets/socketHandler');

const USER_FIELDS = 'name email avatar';

const populateTask = (task) =>
    task.populate([
        { path: 'assignedTo', select: USER_FIELDS },
        { path: 'createdBy', select: USER_FIELDS }
    ]);

const isActiveMember = (workSpace, userId) =>
    workSpace.members.some(
        (m) => (m.user._id || m.user).toString() === userId.toString() && m.status === 'active'
    );

const findProject = async (req) => {
    const project = await Project.findOne({ _id: req.params.projectId, workSpace: req.workSpace._id });
    if (!project) throw createError('Project not found', 404);
    return project;
};

const assertAssignable = (req, userId) => {
    if (userId && !isActiveMember(req.workSpace, userId)) {
        throw createError('The assignee must be an active member of this workspace', 400);
    }
};

const createTask = asyncHandler(async (req, res) => {
    const project = await findProject(req);
    const { assignedTo, dueDate, ...fields } = req.body;
    assertAssignable(req, assignedTo);

    // Atomic counter -> collision-free issue numbers even under concurrency
    const counter = await Project.findOneAndUpdate({ _id: project._id }, { $inc: { taskCounter: 1 } }, { new: true });
    const number = counter.taskCounter;
    const key = `${project.key || 'TSK'}-${number}`;

    const task = await Task.create({
        ...fields,
        key,
        number,
        dueDate: dueDate || undefined,
        project: project._id,
        workSpace: req.workSpace._id,
        assignedTo: assignedTo || req.user._id,
        createdBy: req.user._id,
        completedAt: fields.status === 'done' ? new Date() : undefined
    });
    await populateTask(task);

    await Logger({ workSpaceId: req.workSpace._id, actorId: req.user._id, actionType: 'CREATE_TASK', details: { key, title: task.title } });
    await notify({
        recipient: task.assignedTo?._id,
        sender: req.user._id,
        type: 'TASK_ASSIGNED',
        message: `${req.user.name} assigned you ${key}: ${task.title}`,
        targetModel: 'Task',
        targetId: task._id,
        link: `/workspaces/${req.workSpace._id}/tasks/${project._id}/${task._id}`
    });

    emitToWorkspace(req.workSpace._id, 'taskCreated', { projectId: project._id, task, actor: req.user._id });
    sendResponse(res, 201, true, 'Task created successfully', { task });
});

const buildFilter = (req, extra = {}) => {
    const { status, priority, assignee, q } = req.query;
    const filter = { workSpace: req.workSpace._id, ...extra };
    if (status) filter.status = String(status);
    if (priority) filter.priority = String(priority);
    if (assignee) filter.assignedTo = assignee === 'me' ? req.user._id : String(assignee);
    if (q) filter.title = new RegExp(escapeRegex(String(q).slice(0, 80)), 'i');
    return filter;
};

const getProjectTasks = asyncHandler(async (req, res) => {
    const project = await findProject(req);
    const tasks = await Task.find(buildFilter(req, { project: project._id }))
        .populate('assignedTo', USER_FIELDS)
        .populate('createdBy', USER_FIELDS)
        .sort('-createdAt')
        .limit(1000);
    sendResponse(res, 200, true, 'Tasks retrieved successfully', { tasks });
});

// All tasks in the workspace (backlog / planning views)
const getWorkspaceTasks = asyncHandler(async (req, res) => {
    const tasks = await Task.find(buildFilter(req))
        .populate('assignedTo', USER_FIELDS)
        .populate('project', 'title key status')
        .sort('-createdAt')
        .limit(2000);
    sendResponse(res, 200, true, 'Tasks retrieved successfully', { tasks });
});

const getTaskDetails = asyncHandler(async (req, res, next) => {
    const task = await Task.findOne({ _id: req.params.taskId, project: req.params.projectId, workSpace: req.workSpace._id })
        .populate('assignedTo', USER_FIELDS)
        .populate('createdBy', USER_FIELDS)
        .populate('project', 'title key status');
    if (!task) return next(createError('Task not found', 404));
    sendResponse(res, 200, true, 'Task retrieved successfully', { task });
});

const updateTask = asyncHandler(async (req, res, next) => {
    const task = await Task.findOne({ _id: req.params.taskId, project: req.params.projectId, workSpace: req.workSpace._id });
    if (!task) return next(createError('Task not found', 404));

    const { assignedTo, status, dueDate, ...rest } = req.body;
    const previousAssignee = task.assignedTo?.toString();

    if ('assignedTo' in req.body) {
        if (assignedTo) {
            assertAssignable(req, assignedTo);
            task.assignedTo = assignedTo;
        } else {
            task.assignedTo = undefined;
        }
    }
    if ('dueDate' in req.body) task.dueDate = dueDate || undefined;

    Object.assign(task, rest);

    if (status && status !== task.status) {
        task.status = status;
        task.completedAt = status === 'done' ? new Date() : undefined;
    }

    await task.save();
    await populateTask(task);

    await Logger({
        workSpaceId: req.workSpace._id,
        actorId: req.user._id,
        actionType: 'UPDATE_TASK',
        details: { key: task.key, title: task.title, updatedFields: Object.keys(req.body) }
    });

    if (assignedTo && assignedTo !== previousAssignee) {
        await notify({
            recipient: assignedTo,
            sender: req.user._id,
            type: 'TASK_ASSIGNED',
            message: `${req.user.name} assigned you ${task.key || 'a task'}: ${task.title}`,
            targetModel: 'Task',
            targetId: task._id,
            link: `/workspaces/${req.workSpace._id}/tasks/${req.params.projectId}/${task._id}`
        });
    }

    emitToWorkspace(req.workSpace._id, 'taskUpdated', { projectId: req.params.projectId, task, actor: req.user._id });
    sendResponse(res, 200, true, 'Task updated successfully', { task });
});

const deleteTask = asyncHandler(async (req, res, next) => {
    const Comment = require('../models/commentModel');
    const task = await Task.findOneAndDelete({ _id: req.params.taskId, project: req.params.projectId, workSpace: req.workSpace._id });
    if (!task) return next(createError('Task not found', 404));

    await Comment.deleteMany({ task: task._id });
    await Logger({ workSpaceId: req.workSpace._id, actorId: req.user._id, actionType: 'DELETE_TASK', details: { key: task.key, title: task.title } });

    emitToWorkspace(req.workSpace._id, 'taskDeleted', { projectId: req.params.projectId, taskId: task._id, actor: req.user._id });
    sendResponse(res, 200, true, 'Task deleted successfully');
});

module.exports = { createTask, getProjectTasks, getWorkspaceTasks, getTaskDetails, updateTask, deleteTask };
