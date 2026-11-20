const express = require('express');
const c = require('../controllers/userController');
const Auth = require('../middlewares/authMiddleware');
const RBAC = require('../middlewares/rbacMiddleware');
const validate = require('../middlewares/validationMiddleware');
const s = require('../validators/schemas');

const router = express.Router();
router.use(Auth);

router.get('/profile', c.getUserProfile);
router.patch('/update-profile', validate(s.updateProfile), c.updateProfile);
router.patch('/change-password', validate(s.changePassword), c.changePassword);
router.get('/me/tasks', c.getMyTasks);
router.delete('/delete-me', c.deleteMe);

// Workspace member directory (role changes / removal live under /workspaces/:id/members)
router.get('/:workSpaceId/workspace-users', RBAC(['owner', 'admin']), c.getAllUsers);
router.get('/:workSpaceId/workspace-users/:id', RBAC(['owner', 'admin']), c.getUserById);

module.exports = router;
