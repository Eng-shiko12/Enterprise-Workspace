const Workspace = require('../models/workSpaceModel');
const Project = require('../models/ProjectModel');
const Task = require('../models/taskModel');
const User = require('../models/userModel');
const asyncHandler = require('../utils/asyncHandler');
const createError = require('../utils/AppError');
const sendResponse = require('../utils/sendResponse');
const Logger = require('../utils/activityLogger');
const { deleteWorkspaceData } = require('../utils/cascade');
const { emitToWorkspace } = require('../sockets/socketHandler');

const STATUS_LABELS = { todo: 'To Do', in_progress: 'In Progress', review: 'In Review', done: 'Done' };
const PRIORITY_LABELS = { low: 'Low', medium: 'Medium', high: 'High', urgent: 'Urgent' };
const DAY = 24 * 60 * 60 * 1000;

const createWorkspace = asyncHandler(async (req, res) => {
    const { name, description } = req.body;

    const workspace = await Workspace.create({
        name,
        description,
        owner: req.user._id,
        members: [{ user: req.user._id, role: 'owner', status: 'active', joinedAt: new Date() }]
    });

    await Logger({ workSpaceId: workspace._id, actorId: req.user._id, actionType: 'CREATE_WORKSPACE', details: { name } });
    sendResponse(res, 201, true, 'Workspace created successfully', { workspace });
});

const getMyWorkspaces = asyncHandler(async (req, res) => {
    const spaces = await Workspace.find({ 'members.user': req.user._id })
        .populate('owner', 'name email')
        .sort('-updatedAt')
        .lean();

    const me = req.user._id.toString();
    const allSpace = [];
    const pendingInvites = [];

    spaces.forEach((space) => {
        const mine = space.members.find((m) => m.user.toString() === me);
        if (!mine) return;
        const summary = {
            ...space,
            members: undefined,
            memberCount: space.members.filter((m) => m.status === 'active').length,
            myRole: mine.role,
            myStatus: mine.status
        };
        if (mine.status === 'active') allSpace.push(summary);
        else if (mine.status === 'pending') pendingInvites.push({ ...summary, invitedRole: mine.role });
    });

    sendResponse(res, 200, true, 'Workspaces fetched successfully', { allSpace, pendingInvites });
});

const getWorkspaceDetails = asyncHandler(async (req, res) => {
    const workSpace = await req.workSpace.populate('members.user', 'name email avatar');
    sendResponse(res, 200, true, 'Workspace retrieved successfully', {
        workSpace: { ...workSpace.toObject(), myRole: req.memberRole }
    });
});

const updateWorkspace = asyncHandler(async (req, res) => {
    Object.assign(req.workSpace, req.body);
    await req.workSpace.save();
    emitToWorkspace(req.workSpace._id, 'workspaceUpdated', { actor: req.user._id });
    sendResponse(res, 200, true, 'Workspace updated successfully', { workSpace: req.workSpace });
});

const deleteWorkspace = asyncHandler(async (req, res) => {
    const id = req.workSpace._id;
    await deleteWorkspaceData(id);
    await Workspace.deleteOne({ _id: id });
    emitToWorkspace(id, 'workspaceDeleted', { workspaceId: id });
    sendResponse(res, 200, true, 'Workspace deleted successfully');
});

// ─── Analytics ───────────────────────────────────────────────────────
const dayKey = (d) => new Date(d).toISOString().slice(0, 10);

const buildBurndown = (project, tasks) => {
    const weight = (t) => t.points || 1;
    const start = new Date(project.startDate || project.createdAt);
    start.setUTCHours(0, 0, 0, 0);
    let end = project.endDate ? new Date(project.endDate) : new Date(start.getTime() + 13 * DAY);
    end.setUTCHours(0, 0, 0, 0);
    if (end <= start) end = new Date(start.getTime() + 13 * DAY);

    const totalDays = Math.min(Math.round((end - start) / DAY) + 1, 90);
    const today = Date.now();

    const remainingAt = (dayEnd) =>
        tasks
            .filter((t) => new Date(t.createdAt) <= dayEnd && (!t.completedAt || new Date(t.completedAt) > dayEnd))
            .reduce((sum, t) => sum + weight(t), 0);

    const days = [];
    const actual = [];
    const ideal = [];
    const scopeAtStart = remainingAt(new Date(start.getTime() + DAY - 1)) || tasks.reduce((s, t) => s + weight(t), 0);

    for (let i = 0; i < totalDays; i += 1) {
        const dayStart = new Date(start.getTime() + i * DAY);
        const dayEnd = new Date(dayStart.getTime() + DAY - 1);
        days.push(dayKey(dayStart));
        ideal.push(Number((scopeAtStart * (1 - i / Math.max(totalDays - 1, 1))).toFixed(1)));
        actual.push(dayStart.getTime() <= today ? remainingAt(dayEnd) : null);
    }

    return { days, ideal, actual, daysTotal: totalDays, dayNumber: Math.min(Math.max(Math.floor((today - start) / DAY) + 1, 0), totalDays) };
};

const getWorkspaceAnalytics = asyncHandler(async (req, res) => {
    const workSpaceId = req.workSpace._id;
    const [projects, tasks] = await Promise.all([
        Project.find({ workSpace: workSpaceId }).sort('-createdAt').lean(),
        Task.find({ workSpace: workSpaceId })
            .select('title key status priority points assignedTo project dueDate createdAt completedAt')
            .lean()
    ]);

    const weight = (t) => t.points || 1;
    const now = Date.now();
    const done = tasks.filter((t) => t.status === 'done');
    const open = tasks.filter((t) => t.status !== 'done');
    const sum = (arr) => arr.reduce((s, t) => s + weight(t), 0);

    const group = (field, labels) =>
        Object.keys(labels).map((k) => {
            const items = tasks.filter((t) => t[field] === k);
            return { key: k, name: labels[k], count: items.length, points: sum(items) };
        });

    const cycle = done.filter((t) => t.completedAt).map((t) => (new Date(t.completedAt) - new Date(t.createdAt)) / DAY);
    const avgCycleDays = cycle.length ? Number((cycle.reduce((a, b) => a + b, 0) / cycle.length).toFixed(1)) : null;

    // Workload per assignee
    const userIds = [...new Set(tasks.map((t) => t.assignedTo && t.assignedTo.toString()).filter(Boolean))];
    const users = await User.find({ _id: { $in: userIds } }).select('name avatar').lean();
    const workload = users
        .map((u) => {
            const mine = tasks.filter((t) => t.assignedTo && t.assignedTo.toString() === u._id.toString());
            const mineOpen = mine.filter((t) => t.status !== 'done');
            return {
                user: u,
                openTasks: mineOpen.length,
                openPoints: sum(mineOpen),
                donePoints: sum(mine.filter((t) => t.status === 'done'))
            };
        })
        .sort((a, b) => b.openPoints - a.openPoints);

    // Velocity per project (last 6)
    const velocity = projects
        .slice(0, 6)
        .reverse()
        .map((p) => {
            const mine = tasks.filter((t) => t.project.toString() === p._id.toString());
            return { id: p._id, title: p.title, key: p.key, status: p.status, committed: sum(mine), completed: sum(mine.filter((t) => t.status === 'done')) };
        });

    // Burndown for the requested project, else the active one, else the newest
    const wanted = req.query.projectId;
    const focus = projects.find((p) => p._id.toString() === wanted) || projects.find((p) => p.status === 'active') || projects[0];
    const burndown = focus
        ? {
            project: { _id: focus._id, title: focus.title, key: focus.key, status: focus.status, startDate: focus.startDate, endDate: focus.endDate },
            ...buildBurndown(focus, tasks.filter((t) => t.project.toString() === focus._id.toString()))
        }
        : null;

    const attention = open
        .filter((t) => (t.dueDate && new Date(t.dueDate) < now) || t.priority === 'urgent')
        .sort((a, b) => (a.dueDate ? new Date(a.dueDate) : Infinity) - (b.dueDate ? new Date(b.dueDate) : Infinity))
        .slice(0, 6)
        .map((t) => ({
            _id: t._id, key: t.key, title: t.title, priority: t.priority, status: t.status, dueDate: t.dueDate, project: t.project,
            overdue: Boolean(t.dueDate && new Date(t.dueDate) < now)
        }));

    sendResponse(res, 200, true, 'Analytics fetched successfully', {
        totals: {
            projects: projects.length,
            tasks: tasks.length,
            done: done.length,
            points: sum(tasks),
            donePoints: sum(done),
            inProgressPoints: sum(tasks.filter((t) => t.status === 'in_progress')),
            reviewPoints: sum(tasks.filter((t) => t.status === 'review')),
            overdue: open.filter((t) => t.dueDate && new Date(t.dueDate) < now).length,
            completionRate: tasks.length ? Math.round((done.length / tasks.length) * 100) : 0,
            avgCycleDays
        },
        byStatus: group('status', STATUS_LABELS),
        byPriority: group('priority', PRIORITY_LABELS),
        workload,
        velocity,
        burndown,
        attention,
        // kept for backwards compatibility with the previous client
        totalProjects: projects.length,
        totalTasks: tasks.length
    });
});

const getWorkspaceActivityLogs = asyncHandler(async (req, res) => {
    const ActivityLog = require('../models/activityLogModel');
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 15, 1), 100);

    const query = { workSpace: req.workSpace._id };
    if (req.query.action) query.actionType = String(req.query.action);

    const [totalLogs, logs] = await Promise.all([
        ActivityLog.countDocuments(query),
        ActivityLog.find(query).populate('actor', 'name email avatar').sort('-createdAt').skip((page - 1) * limit).limit(limit)
    ]);

    sendResponse(res, 200, true, 'Activity logs fetched successfully', {
        logs, currentPage: page, totalPages: Math.ceil(totalLogs / limit), totalLogs
    });
});

module.exports = {
    createWorkspace, getMyWorkspaces, getWorkspaceDetails, updateWorkspace,
    deleteWorkspace, getWorkspaceAnalytics, getWorkspaceActivityLogs
};

// Re-exported for tests
module.exports.__test = { buildBurndown };
