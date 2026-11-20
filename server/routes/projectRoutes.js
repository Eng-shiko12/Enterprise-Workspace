const express = require('express');
const p = require('../controllers/projectController');
const t = require('../controllers/taskController');
const c = require('../controllers/commentController');
const Auth = require('../middlewares/authMiddleware');
const RBAC = require('../middlewares/rbacMiddleware');
const validate = require('../middlewares/validationMiddleware');
const s = require('../validators/schemas');

const router = express.Router();
router.use(Auth);

const anyMember = RBAC(['owner', 'admin', 'member']);
const staff = RBAC(['owner', 'admin']);
const owner = RBAC(['owner']);

// Projects
router.post('/:workSpaceId/projects', staff, validate(s.project), p.createProject);
router.get('/:workSpaceId/projects', anyMember, p.getWorkspaceProjects);
router.get('/:workSpaceId/projects/:id', anyMember, p.getProjectDetails);
router.patch('/:workSpaceId/projects/:id', staff, validate(s.projectUpdate), p.updateProject);
router.delete('/:workSpaceId/projects/:id', owner, p.deleteProject);

// Tasks
router.get('/:workSpaceId/tasks', anyMember, t.getWorkspaceTasks);
router.post('/:workSpaceId/projects/:projectId/tasks', anyMember, validate(s.task), t.createTask);
router.get('/:workSpaceId/projects/:projectId/tasks', anyMember, t.getProjectTasks);
router.get('/:workSpaceId/projects/:projectId/tasks/:taskId', anyMember, t.getTaskDetails);
router.patch('/:workSpaceId/projects/:projectId/tasks/:taskId', anyMember, validate(s.taskUpdate), t.updateTask);
router.delete('/:workSpaceId/projects/:projectId/tasks/:taskId', staff, t.deleteTask);

// Comments
router.post('/:workSpaceId/projects/:projectId/tasks/:taskId/comments', anyMember, validate(s.comment), c.addComment);
router.get('/:workSpaceId/projects/:projectId/tasks/:taskId/comments', anyMember, c.getTaskComments);
router.patch('/:workSpaceId/comments/:commentId', anyMember, validate(s.comment), c.updateComment);
router.delete('/:workSpaceId/comments/:commentId', anyMember, c.deleteComment);

module.exports = router;
