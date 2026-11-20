const Card = require('../models/cardModel');
const List = require('../models/listModel');
const Board = require('../models/boardModel');
const asyncHandler = require('../utils/asyncHandler');
const createError = require('../utils/AppError');
const Logger = require('../utils/activityLogger');
const handleReorder = require('../utils/reorderUtil');
const sendResponse = require('../utils/sendResponse');
const notify = require('../utils/notify');
const { emitToBoard } = require('../sockets/socketHandler');

// A list is only valid when its board lives inside the workspace from the URL (IDOR guard)
const verifyListAndBoard = async (listId, workSpaceId) => {
    const list = await List.findById(listId);
    if (!list) return null;
    const board = await Board.findOne({ _id: list.board, workSpace: workSpaceId });
    return board ? { list, board } : null;
};

const announce = (req, boardId, action, extra = {}) =>
    emitToBoard(boardId, 'boardUpdated', { action, boardId, actor: req.user._id, ...extra });

const createCard = asyncHandler(async (req, res, next) => {
    const verified = await verifyListAndBoard(req.params.listId, req.workSpace._id);
    if (!verified) return next(createError('List not found in this workspace', 404));
    const { list, board } = verified;

    const last = await Card.findOne({ list: list._id }).sort('-order').select('order');
    const { dueDate, ...fields } = req.body;
    const card = await Card.create({ ...fields, dueDate: dueDate || undefined, list: list._id, board: board._id, order: last ? last.order + 1 : 0 });
    await card.populate('assignedTo', 'name avatar');

    await Logger({ workSpaceId: req.workSpace._id, boardId: board._id, cardId: card._id, actorId: req.user._id, actionType: 'CREATE_CARD', details: { title: card.title } });
    announce(req, board._id, 'CREATE_CARD');
    sendResponse(res, 201, true, 'Card created successfully', { card });
});

const getListCards = asyncHandler(async (req, res, next) => {
    const verified = await verifyListAndBoard(req.params.listId, req.workSpace._id);
    if (!verified) return next(createError('List not found in this workspace', 404));
    const cards = await Card.find({ list: req.params.listId, isArchived: { $ne: true } }).sort('order').populate('assignedTo', 'name avatar');
    sendResponse(res, 200, true, 'Cards fetched successfully', { cards });
});

const updateCard = asyncHandler(async (req, res, next) => {
    const verified = await verifyListAndBoard(req.params.listId, req.workSpace._id);
    if (!verified) return next(createError('List not found in this workspace', 404));

    const card = await Card.findOne({ _id: req.params.cardId, list: req.params.listId });
    if (!card) return next(createError('Card not found', 404));

    const { dueDate, assignedTo, ...rest } = req.body;
    const before = (card.assignedTo || []).map(String);
    Object.assign(card, rest);
    if ('dueDate' in req.body) card.dueDate = dueDate || undefined;
    if (assignedTo) card.assignedTo = assignedTo;
    await card.save();
    await card.populate('assignedTo', 'name avatar');

    await Promise.all((assignedTo || []).filter((id) => !before.includes(id)).map((recipient) => notify({
        recipient,
        sender: req.user._id,
        type: 'ASSIGNED_TO_CARD',
        message: `${req.user.name} assigned you to "${card.title}"`,
        targetModel: 'Card',
        targetId: card._id,
        link: `/workspaces/${req.workSpace._id}/boards/${card.board}`
    })));

    await Logger({ workSpaceId: req.workSpace._id, boardId: card.board, cardId: card._id, actorId: req.user._id, actionType: 'UPDATE_CARD', details: { updatedFields: Object.keys(req.body) } });
    announce(req, card.board, 'UPDATE_CARD');
    sendResponse(res, 200, true, 'Card updated successfully', { card });
});

const deleteCard = asyncHandler(async (req, res, next) => {
    const verified = await verifyListAndBoard(req.params.listId, req.workSpace._id);
    if (!verified) return next(createError('List not found in this workspace', 404));

    const card = await Card.findOneAndDelete({ _id: req.params.cardId, list: req.params.listId });
    if (!card) return next(createError('Card not found', 404));

    await Logger({ workSpaceId: req.workSpace._id, boardId: card.board, cardId: card._id, actorId: req.user._id, actionType: 'DELETE_CARD', details: { title: card.title } });
    announce(req, card.board, 'DELETE_CARD');
    sendResponse(res, 200, true, 'Card deleted successfully');
});

// Re-order cards inside one list
const reorderCard = asyncHandler(async (req, res, next) => {
    const verified = await verifyListAndBoard(req.params.listId, req.workSpace._id);
    if (!verified) return next(createError('List not found in this workspace', 404));

    await handleReorder(Card, req.body.cards, { list: verified.list._id });
    announce(req, verified.board._id, 'REORDER_CARDS');
    sendResponse(res, 200, true, 'Cards reordered successfully');
});

/**
 * Move a card to any list of the same board at a given index.
 * Both the source and destination lists are re-numbered so `order` stays gap-free.
 */
const moveCard = asyncHandler(async (req, res, next) => {
    const { listId, index } = req.body;

    const card = await Card.findById(req.params.cardId);
    if (!card) return next(createError('Card not found', 404));

    const board = await Board.findOne({ _id: card.board, workSpace: req.workSpace._id });
    if (!board) return next(createError('Card not found', 404));

    const destList = await List.findOne({ _id: listId, board: board._id });
    if (!destList) return next(createError('Destination list not found on this board', 404));

    const sourceId = card.list.toString();
    const destId = destList._id.toString();

    const siblings = async (id) => (await Card.find({ list: id, _id: { $ne: card._id }, isArchived: { $ne: true } }).sort('order').select('_id')).map((c) => c._id);

    const destIds = await siblings(destId);
    destIds.splice(Math.min(index, destIds.length), 0, card._id);

    const ops = destIds.map((id, i) => ({
        updateOne: { filter: { _id: id }, update: { $set: { order: i, ...(id.equals(card._id) && { list: destList._id }) } } }
    }));

    if (sourceId !== destId) {
        (await siblings(sourceId)).forEach((id, i) => ops.push({ updateOne: { filter: { _id: id }, update: { $set: { order: i } } } }));
    }
    await Card.bulkWrite(ops);

    if (sourceId !== destId) {
        await Logger({ workSpaceId: req.workSpace._id, boardId: board._id, cardId: card._id, actorId: req.user._id, actionType: 'MOVE_CARD', details: { title: card.title, to: destList.title } });
    }
    announce(req, board._id, 'MOVE_CARD');
    sendResponse(res, 200, true, 'Card moved successfully');
});

module.exports = { createCard, getListCards, updateCard, deleteCard, reorderCard, moveCard };
