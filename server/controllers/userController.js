const bcrypt = require('bcryptjs');
const User = require('../models/userModel');
const WorkSpace = require('../models/workSpaceModel');
const Task = require('../models/taskModel');
const createError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const sendResponse = require('../utils/sendResponse');
const { clearAuthCookie } = require('../utils/cookies');

const getUserProfile = asyncHandler(async (req, res) => {
    sendResponse(res, 200, true, 'User profile fetched successfully', { user: req.user });
});

const updateProfile = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);
    Object.assign(user, req.body);
    await user.save();
    sendResponse(res, 200, true, 'Profile updated successfully', { user });
});

const changePassword = asyncHandler(async (req, res, next) => {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id).select('+password');

    if (!(await bcrypt.compare(currentPassword, user.password))) {
        return next(createError('Your current password is incorrect', 400));
    }
    if (currentPassword === newPassword) {
        return next(createError('Choose a password different from the current one', 400));
    }

    user.password = newPassword;
    await user.save();
    sendResponse(res, 200, true, 'Password changed successfully');
});

const deleteMe = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(req.user._id, { isActive: false });
    clearAuthCookie(res);
    sendResponse(res, 200, true, 'Account deactivated successfully');
});

// Tasks assigned to the current user across every workspace they actively belong to
const getMyTasks = asyncHandler(async (req, res) => {
    const workspaces = await WorkSpace.find({
        members: { $elemMatch: { user: req.user._id, status: 'active' } }
    }).select('name');

    const names = Object.fromEntries(workspaces.map((w) => [w._id.toString(), w.name]));

    const tasks = await Task.find({
        assignedTo: req.user._id,
        workSpace: { $in: workspaces.map((w) => w._id) }
    })
        .populate('project', 'title key')
        .sort('-updatedAt')
        .limit(200)
        .lean();

    sendResponse(res, 200, true, 'Tasks fetched successfully', {
        tasks: tasks.map((t) => ({ ...t, workSpaceName: names[t.workSpace.toString()] }))
    });
});

// ─── Workspace user management (owner / admin) ───────────────────────
const getAllUsers = asyncHandler(async (req, res) => {
    const workspace = await req.workSpace.populate('members.user', 'name email avatar');
    const users = workspace.members.map((m) => ({
        ...(m.user.toObject ? m.user.toObject() : m.user),
        role: m.role,
        status: m.status,
        joinedAt: m.joinedAt
    }));
    sendResponse(res, 200, true, 'Users fetched successfully', { users });
});

const getUserById = asyncHandler(async (req, res, next) => {
    const member = req.workSpace.members.find((m) => (m.user._id || m.user).toString() === req.params.id);
    if (!member) return next(createError('User not found in this workspace', 404));

    const user = await User.findById(req.params.id);
    if (!user) return next(createError('User not found', 404));

    sendResponse(res, 200, true, 'User found', { user, workspaceRole: member.role });
});

module.exports = { getUserProfile, updateProfile, changePassword, deleteMe, getMyTasks, getAllUsers, getUserById };
