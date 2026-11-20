const List = require('../models/listModel');
const Board = require('../models/boardModel');
const Card = require('../models/cardModel');
const asyncHandler = require('../utils/asyncHandler');
const createError = require('../utils/AppError');
const Logger = require('../utils/activityLogger');
const handleReorder = require('../utils/reorderUtil');
const sendResponse = require('../utils/sendResponse');
const { emitToBoard } = require('../sockets/socketHandler');

const findBoard = async (req) => {
    const board = await Board.findOne({ _id: req.params.boardId, workSpace: req.workSpace._id });
    if (!board) throw createError('Board not found in this workspace', 404);
    return board;
};

const announce = (req, board, action, extra = {}) =>
    emitToBoard(board._id, 'boardUpdated', { action, boardId: board._id, actor: req.user._id, ...extra });

const createList = asyncHandler(async (req, res) => {
    const board = await findBoard(req);
    const last = await List.findOne({ board: board._id }).sort('-order').select('order');

    const list = await List.create({ title: req.body.title, board: board._id, order: last ? last.order + 1 : 0 });

    await Logger({ workSpaceId: req.workSpace._id, boardId: board._id, actorId: req.user._id, actionType: 'CREATE_LIST', details: { title: list.title } });
    announce(req, board, 'CREATE_LIST');
    sendResponse(res, 201, true, 'List created successfully', { list: { ...list.toObject(), cards: [] } });
});

const getBoardLists = asyncHandler(async (req, res) => {
    const board = await findBoard(req);
    const lists = await List.find({ board: board._id, isArchived: { $ne: true } }).sort('order');
    sendResponse(res, 200, true, 'Lists retrieved successfully', { lists });
});

const updateList = asyncHandler(async (req, res, next) => {
    const board = await findBoard(req);
    const list = await List.findOne({ _id: req.params.listId, board: board._id });
    if (!list) return next(createError('List not found', 404));

    Object.assign(list, req.body);
    await list.save();

    await Logger({ workSpaceId: req.workSpace._id, boardId: board._id, actorId: req.user._id, actionType: 'UPDATE_LIST', details: { updatedFields: Object.keys(req.body) } });
    announce(req, board, 'UPDATE_LIST');
    sendResponse(res, 200, true, 'List updated successfully', { list });
});

const deleteList = asyncHandler(async (req, res, next) => {
    const board = await findBoard(req);
    const list = await List.findOneAndDelete({ _id: req.params.listId, board: board._id });
    if (!list) return next(createError('List not found', 404));

    await Card.deleteMany({ list: list._id });

    await Logger({ workSpaceId: req.workSpace._id, boardId: board._id, actorId: req.user._id, actionType: 'DELETE_LIST', details: { title: list.title } });
    announce(req, board, 'DELETE_LIST');
    sendResponse(res, 200, true, 'List deleted successfully');
});

const reorderList = asyncHandler(async (req, res) => {
    const board = await findBoard(req);
    await handleReorder(List, req.body.lists, { board: board._id });

    announce(req, board, 'REORDER_LIST');
    sendResponse(res, 200, true, 'Lists reordered successfully');
});

module.exports = { createList, getBoardLists, updateList, deleteList, reorderList };
