const express = require('express');
const c = require('../controllers/boardController');
const Auth = require('../middlewares/authMiddleware');
const RBAC = require('../middlewares/rbacMiddleware');
const validate = require('../middlewares/validationMiddleware');
const s = require('../validators/schemas');

const router = express.Router();
router.use(Auth);

const anyMember = RBAC(['owner', 'admin', 'member']);

router.post('/:workSpaceId/boards', RBAC(['owner', 'admin']), validate(s.board), c.createBoard);
router.get('/:workSpaceId/boards', anyMember, c.getWorkspaceBoards);
router.get('/:workSpaceId/boards/:boardId', anyMember, c.getBoardDetails);
router.patch('/:workSpaceId/boards/:boardId', RBAC(['owner', 'admin']), validate(s.boardUpdate), c.updateBoard);
router.delete('/:workSpaceId/boards/:boardId', RBAC(['owner']), c.deleteBoard);

module.exports = router;
