const User = require('../models/userModel');
const Workspace = require('../models/workSpaceModel');
const Task = require('../models/taskModel');
const asyncHandler = require('../utils/asyncHandler');
const createError = require('../utils/AppError');
const sendEmail = require('../utils/emailUtils');
const { escapeHtml } = require('../utils/emailUtils');
const sendResponse = require('../utils/sendResponse');
const notify = require('../utils/notify');
const Logger = require('../utils/activityLogger');
const { emitToWorkspace, emitToUser } = require('../sockets/socketHandler');
const { config } = require('../config/env');

const idOf = (m) => (m.user._id || m.user).toString();

const inviteMember = asyncHandler(async (req, res, next) => {
    const { email, role } = req.body;

    // Only the owner can hand out admin rights
    if (role === 'admin' && req.memberRole !== 'owner') {
        return next(createError('Only the workspace owner can invite admins', 403));
    }

    const user = await User.findOne({ email });
    if (!user) return next(createError('No Vortex account was found for that email address', 404));

    if (req.workSpace.members.some((m) => idOf(m) === user._id.toString())) {
        return next(createError('That user is already a member (or has a pending invitation)', 400));
    }

    req.workSpace.members.push({ user: user._id, role, status: 'pending' });
    await req.workSpace.save();

    await notify({
        recipient: user._id,
        sender: req.user._id,
        type: 'WORKSPACE_INVITE',
        message: `${req.user.name} invited you to join "${req.workSpace.name}" as ${role}.`,
        targetModel: 'Workspace',
        targetId: req.workSpace._id,
        link: '/workspaces'
    });
    await Logger({ workSpaceId: req.workSpace._id, actorId: req.user._id, actionType: 'INVITE_MEMBER', details: { email, role } });
    emitToWorkspace(req.workSpace._id, 'workspaceUpdated', { actor: req.user._id });

    // Email is best-effort: the in-app invitation already exists
    try {
        const url = `${config.clientOrigins[0]}/workspaces`;
        await sendEmail({
            email: user.email,
            subject: `You're invited to ${req.workSpace.name} on Vortex`,
            html: `<div style="font-family:Arial,sans-serif;padding:20px;color:#222">
                <h2>You've been invited</h2>
                <p>${escapeHtml(req.user.name)} invited you to the workspace <strong>${escapeHtml(req.workSpace.name)}</strong> as <strong>${role}</strong>.</p>
                <p><a href="${url}" style="background:#6366f1;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;display:inline-block">Review invitation</a></p>
            </div>`
        });
    } catch (err) {
        console.warn('Invitation email not sent:', err.message);
    }

    sendResponse(res, 200, true, 'Invitation sent', { user: { id: user._id, name: user.name, email: user.email, role } });
});

const updateMemberRole = asyncHandler(async (req, res, next) => {
    const member = req.workSpace.members.find((m) => idOf(m) === req.params.userId);
    if (!member) return next(createError('User is not a member of this workspace', 404));
    if (member.role === 'owner') return next(createError("The owner's role cannot be changed", 403));

    member.role = req.body.role;
    await req.workSpace.save();
    emitToWorkspace(req.workSpace._id, 'workspaceUpdated', { actor: req.user._id });

    sendResponse(res, 200, true, 'Member role updated', { member: { userId: member.user, role: member.role } });
});

const removeMember = asyncHandler(async (req, res, next) => {
    const { userId } = req.params;
    const target = req.workSpace.members.find((m) => idOf(m) === userId);
    if (!target) return next(createError('User is not a member of this workspace', 404));
    if (target.role === 'owner') return next(createError('The workspace owner cannot be removed', 403));
    if (userId === req.user._id.toString()) return next(createError('Use "Leave workspace" to remove yourself', 400));
    if (target.role === 'admin' && req.memberRole !== 'owner') {
        return next(createError('Only the owner can remove an admin', 403));
    }

    req.workSpace.members = req.workSpace.members.filter((m) => idOf(m) !== userId);
    await req.workSpace.save();
    await Task.updateMany({ workSpace: req.workSpace._id, assignedTo: userId }, { $unset: { assignedTo: 1 } });

    emitToUser(userId, 'removedFromWorkspace', { workspaceId: req.workSpace._id });
    emitToWorkspace(req.workSpace._id, 'workspaceUpdated', { actor: req.user._id });
    sendResponse(res, 200, true, 'Member removed from workspace', { removedUserId: userId });
});

const leaveWorkspace = asyncHandler(async (req, res, next) => {
    const me = req.user._id.toString();
    const index = req.workSpace.members.findIndex((m) => idOf(m) === me);
    if (index === -1) return next(createError('You are not a member of this workspace', 404));
    if (req.workSpace.members[index].role === 'owner') {
        return next(createError('Workspace owners cannot leave. Delete the workspace instead.', 400));
    }

    req.workSpace.members.splice(index, 1);
    await req.workSpace.save();
    await Task.updateMany({ workSpace: req.workSpace._id, assignedTo: req.user._id }, { $unset: { assignedTo: 1 } });
    emitToWorkspace(req.workSpace._id, 'workspaceUpdated', { actor: req.user._id });

    sendResponse(res, 200, true, 'You left the workspace');
});

// Any invited user (status "pending") may answer — this route deliberately has no RBAC
const respondToInvite = asyncHandler(async (req, res, next) => {
    const workspace = await Workspace.findById(req.params.workSpaceId);
    if (!workspace) return next(createError('Workspace not found', 404));

    const me = req.user._id.toString();
    const index = workspace.members.findIndex((m) => idOf(m) === me && m.status === 'pending');
    if (index === -1) return next(createError('No pending invitation found for this workspace', 404));

    const { response } = req.body;
    if (response === 'accept') {
        workspace.members[index].status = 'active';
        workspace.members[index].joinedAt = new Date();
    } else {
        workspace.members.splice(index, 1);
    }
    await workspace.save();

    emitToWorkspace(workspace._id, 'workspaceUpdated', { actor: req.user._id });
    sendResponse(res, 200, true, response === 'accept' ? 'Invitation accepted' : 'Invitation declined');
});

module.exports = { inviteMember, updateMemberRole, removeMember, leaveWorkspace, respondToInvite };
