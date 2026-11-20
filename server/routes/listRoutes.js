const express = require('express');
const c = require('../controllers/listController');
const Auth = require('../middlewares/authMiddleware');
const RBAC = require('../middlewares/rbacMiddleware');
const validate = require('../middlewares/validationMiddleware');
const s = require('../validators/schemas');

const router = express.Router();
router.use(Auth);

const anyMember = RBAC(['owner', 'admin', 'member']);

router.post('/:workSpaceId/boards/:boardId/lists', anyMember, validate(s.list), c.createList);
router.get('/:workSpaceId/boards/:boardId/lists', anyMember, c.getBoardLists);
// "reorder" must be declared before the :listId routes
router.patch('/:workSpaceId/boards/:boardId/lists/reorder', anyMember, validate(s.reorder), c.reorderList);
router.patch('/:workSpaceId/boards/:boardId/lists/:listId', anyMember, validate(s.listUpdate), c.updateList);
router.delete('/:workSpaceId/boards/:boardId/lists/:listId', RBAC(['owner', 'admin']), c.deleteList);

module.exports = router;
