const express = require('express');
const w = require('../controllers/workspaceController');
const m = require('../controllers/memberController');
const Auth = require('../middlewares/authMiddleware');
const RBAC = require('../middlewares/rbacMiddleware');
const validate = require('../middlewares/validationMiddleware');
const s = require('../validators/schemas');

const router = express.Router();
router.use(Auth);

const anyMember = RBAC(['owner', 'admin', 'member']);
const staff = RBAC(['owner', 'admin']);
const owner = RBAC(['owner']);

router.post('/', validate(s.workspace), w.createWorkspace);
router.get('/', w.getMyWorkspaces);

router.get('/:workSpaceId', anyMember, w.getWorkspaceDetails);
router.patch('/:workSpaceId', staff, validate(s.workspaceUpdate), w.updateWorkspace);
router.delete('/:workSpaceId', owner, w.deleteWorkspace);

router.get('/:workSpaceId/analytics', anyMember, w.getWorkspaceAnalytics);
router.get('/:workSpaceId/logs', staff, w.getWorkspaceActivityLogs);

router.post('/:workSpaceId/invite', staff, validate(s.invite), m.inviteMember);
// pending users must be able to answer, so no RBAC here
router.patch('/:workSpaceId/invite/respond', validate(s.inviteResponse), m.respondToInvite);
router.patch('/:workSpaceId/members/:userId', owner, validate(s.memberRole), m.updateMemberRole);
router.delete('/:workSpaceId/members/:userId', staff, m.removeMember);
router.delete('/:workSpaceId/leave', anyMember, m.leaveWorkspace);

module.exports = router;
