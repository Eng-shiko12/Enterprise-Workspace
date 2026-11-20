const Project = require('../models/ProjectModel');
const Task = require('../models/taskModel');
const createError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const sendResponse = require('../utils/sendResponse');
const Logger = require('../utils/activityLogger');
const { generateProjectKey } = require('../utils/projectKey');
const { deleteProjectData } = require('../utils/cascade');
const { emitToWorkspace } = require('../sockets/socketHandler');

const emptyToUndefined = (body) =>
    Object.fromEntries(Object.entries(body).map(([k, v]) => [k, v === '' ? undefined : v]));

const createProject = asyncHandler(async (req, res) => {
    const { title, description, status, startDate, endDate, key } = emptyToUndefined(req.body);

    if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
        throw createError('The end date must be after the start date', 400);
    }

    const project = await Project.create({
        title,
        description,
        status,
        startDate,
        endDate,
        key: await generateProjectKey(req.workSpace._id, title, key),
        workSpace: req.workSpace._id,
        createdBy: req.user._id
    });

    await Logger({ workSpaceId: req.workSpace._id, actorId: req.user._id, actionType: 'CREATE_PROJECT', details: { title, key: project.key } });
    emitToWorkspace(req.workSpace._id, 'projectUpdated', { actor: req.user._id });
    sendResponse(res, 201, true, 'Project created successfully', { project });
});

const getWorkspaceProjects = asyncHandler(async (req, res) => {
    const projects = await Project.find({ workSpace: req.workSpace._id }).sort('-createdAt').lean();

    // One aggregate for all per-project counters instead of N queries
    const stats = await Task.aggregate([
        { $match: { workSpace: req.workSpace._id } },
        {
            $group: {
                _id: '$project',
                total: { $sum: 1 },
                done: { $sum: { $cond: [{ $eq: ['$status', 'done'] }, 1, 0] } },
                points: { $sum: '$points' },
                donePoints: { $sum: { $cond: [{ $eq: ['$status', 'done'] }, '$points', 0] } }
            }
        }
    ]);
    const byProject = Object.fromEntries(stats.map((s) => [s._id.toString(), s]));

    sendResponse(res, 200, true, 'Projects fetched successfully', {
        projects: projects.map((p) => {
            const s = byProject[p._id.toString()] || {};
            return { ...p, stats: { total: s.total || 0, done: s.done || 0, points: s.points || 0, donePoints: s.donePoints || 0 } };
        })
    });
});

const getProjectDetails = asyncHandler(async (req, res, next) => {
    const project = await Project.findOne({ _id: req.params.id, workSpace: req.workSpace._id });
    if (!project) return next(createError('Project not found', 404));
    sendResponse(res, 200, true, 'Project fetched successfully', { project });
});

const updateProject = asyncHandler(async (req, res, next) => {
    const project = await Project.findOne({ _id: req.params.id, workSpace: req.workSpace._id });
    if (!project) return next(createError('Project not found', 404));

    const { startDate, endDate, ...rest } = req.body;
    Object.assign(project, rest);
    // explicit null / '' clears an optional date
    if ('startDate' in req.body) project.startDate = startDate || undefined;
    if ('endDate' in req.body) project.endDate = endDate || undefined;
    if (project.startDate && project.endDate && project.endDate < project.startDate) {
        return next(createError('The end date must be after the start date', 400));
    }
    await project.save();

    emitToWorkspace(req.workSpace._id, 'projectUpdated', { actor: req.user._id });
    sendResponse(res, 200, true, 'Project updated successfully', { project });
});

const deleteProject = asyncHandler(async (req, res, next) => {
    const project = await Project.findOne({ _id: req.params.id, workSpace: req.workSpace._id });
    if (!project) return next(createError('Project not found', 404));

    await deleteProjectData(project._id);
    await Logger({ workSpaceId: req.workSpace._id, actorId: req.user._id, actionType: 'DELETE_PROJECT', details: { title: project.title } });
    emitToWorkspace(req.workSpace._id, 'projectUpdated', { actor: req.user._id });
    sendResponse(res, 200, true, 'Project and its tasks were deleted');
});

module.exports = { createProject, getWorkspaceProjects, getProjectDetails, updateProject, deleteProject };
