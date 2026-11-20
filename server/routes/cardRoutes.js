const express = require('express');
const c = require('../controllers/cardController');
const Auth = require('../middlewares/authMiddleware');
const RBAC = require('../middlewares/rbacMiddleware');
const validate = require('../middlewares/validationMiddleware');
const s = require('../validators/schemas');

const router = express.Router();
router.use(Auth);

const anyMember = RBAC(['owner', 'admin', 'member']);

router.post('/:workSpaceId/lists/:listId/cards', anyMember, validate(s.card), c.createCard);
router.get('/:workSpaceId/lists/:listId/cards', anyMember, c.getListCards);
router.patch('/:workSpaceId/lists/:listId/cards/reorder', anyMember, validate(s.reorder), c.reorderCard);
router.patch('/:workSpaceId/lists/:listId/cards/:cardId', anyMember, validate(s.cardUpdate), c.updateCard);
router.delete('/:workSpaceId/lists/:listId/cards/:cardId', anyMember, c.deleteCard);
router.patch('/:workSpaceId/cards/:cardId/move', anyMember, validate(s.cardMove), c.moveCard);

module.exports = router;
