const WorkSpace = require('../models/workSpaceModel');
const asyncHandler = require('../utils/asyncHandler');
const createError = require('../utils/AppError');

/**
 * Role-based access control for workspace-scoped routes.
 * Only members whose invitation was ACCEPTED (status === 'active') get through;
 * pending / invited users can only use the invite-response endpoint.
 *
 * @param {string[]} allowedRoles e.g. ['owner', 'admin', 'member']
 */
const RBAC = (allowedRoles = []) =>
    asyncHandler(async (req, res, next) => {
        const userId = req.user._id.toString();
        const workSpaceId = req.params.workSpaceId || req.params.workspaceId || req.params.id;

        if (!workSpaceId) {
            return next(createError('Workspace ID is missing in route parameters', 400));
        }

        const workSpace = await WorkSpace.findOne({
            _id: workSpaceId,
            $or: [{ owner: req.user._id }, { 'members.user': req.user._id }]
        });

        // 404 (not 403) so workspace ids cannot be probed by outsiders
        if (!workSpace) {
            return next(createError('Workspace not found or you are not a member of it', 404));
        }

        let memberRole = null;
        if (workSpace.owner && workSpace.owner.toString() === userId) {
            memberRole = 'owner';
        } else {
            const member = workSpace.members.find((m) => (m.user._id || m.user).toString() === userId);
            if (member && member.status === 'active') memberRole = member.role;
        }

        if (!memberRole || !allowedRoles.includes(memberRole)) {
            return next(createError('You do not have permission to perform this action', 403));
        }

        req.workSpace = workSpace;
        req.memberRole = memberRole;
        next();
    });

module.exports = RBAC;
