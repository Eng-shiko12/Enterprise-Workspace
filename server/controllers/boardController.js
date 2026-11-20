const Board = require('../models/boardModel');
const List = require('../models/listModel');
const Card = require('../models/cardModel');
const asyncHandler = require('../utils/asyncHandler');
const createError = require('../utils/AppError');
const Logger = require('../utils/activityLogger');
const sendResponse = require('../utils/sendResponse');
const { deleteBoardData } = require('../utils/cascade');
const { emitToWorkspace, emitToBoard } = require('../sockets/socketHandler');

const createBoard = asyncHandler(async (req, res) => {
    const board = await Board.create({ ...req.body, workSpace: req.workSpace._id });

    // Every new board starts with a sensible default workflow
    await List.insertMany(['To Do', 'In Progress', 'Done'].map((title, order) => ({ title, order, board: board._id })));

    await Logger({ workSpaceId: req.workSpace._id, boardId: board._id, actorId: req.user._id, actionType: 'CREATE_BOARD', details: { title: board.title } });
    emitToWorkspace(req.workSpace._id, 'boardCreated', { board, actor: req.user._id });
    sendResponse(res, 201, true, 'Board created successfully', { board });
});

const getWorkspaceBoards = asyncHandler(async (req, res) => {
    const boards = await Board.find({ workSpace: req.workSpace._id, isArchived: { $ne: true } }).sort('-updatedAt').lean();

    const counts = await Card.aggregate([
        { $match: { board: { $in: boards.map((b) => b._id) }, isArchived: { $ne: true } } },
        { $group: { _id: '$board', cards: { $sum: 1 }, done: { $sum: { $cond: ['$isCompleted', 1, 0] } } } }
    ]);
    const byBoard = Object.fromEntries(counts.map((c) => [c._id.toString(), c]));

    sendResponse(res, 200, true, 'Boards fetched successfully', {
        boards: boards.map((b) => ({ ...b, cardCount: byBoard[b._id.toString()]?.cards || 0, doneCount: byBoard[b._id.toString()]?.done || 0 }))
    });
});

// Returns the board together with its lists and cards in a single round-trip
const getBoardDetails = asyncHandler(async (req, res, next) => {
    const board = await Board.findOne({ _id: req.params.boardId, workSpace: req.workSpace._id }).lean();
    if (!board) return next(createError('Board not found', 404));

    const [lists, cards] = await Promise.all([
        List.find({ board: board._id, isArchived: { $ne: true } }).sort('order').lean(),
        Card.find({ board: board._id, isArchived: { $ne: true } }).sort('order').populate('assignedTo', 'name avatar').lean()
    ]);

    const byList = {};
    cards.forEach((c) => { (byList[c.list.toString()] ||= []).push(c); });

    sendResponse(res, 200, true, 'Board details fetched successfully', {
        board: { ...board, lists: lists.map((l) => ({ ...l, cards: byList[l._id.toString()] || [] })) }
    });
});

const updateBoard = asyncHandler(async (req, res, next) => {
    const board = await Board.findOne({ _id: req.params.boardId, workSpace: req.workSpace._id });
    if (!board) return next(createError('Board not found', 404));

    Object.assign(board, req.body);
    await board.save();

    await Logger({ workSpaceId: req.workSpace._id, boardId: board._id, actorId: req.user._id, actionType: 'UPDATE_BOARD', details: { updatedFields: Object.keys(req.body) } });
    emitToBoard(board._id, 'boardUpdated', { action: 'UPDATE_BOARD', boardId: board._id, actor: req.user._id });
    emitToWorkspace(req.workSpace._id, 'boardCreated', { board, actor: req.user._id });
    sendResponse(res, 200, true, 'Board updated successfully', { board });
});

const deleteBoard = asyncHandler(async (req, res, next) => {
    const board = await Board.findOne({ _id: req.params.boardId, workSpace: req.workSpace._id });
    if (!board) return next(createError('Board not found', 404));

    await deleteBoardData(board._id);

    await Logger({ workSpaceId: req.workSpace._id, boardId: board._id, actorId: req.user._id, actionType: 'DELETE_BOARD', details: { title: board.title } });
    emitToBoard(board._id, 'boardUpdated', { action: 'DELETE_BOARD', boardId: board._id, actor: req.user._id });
    emitToWorkspace(req.workSpace._id, 'boardDeleted', { boardId: board._id, actor: req.user._id });
    sendResponse(res, 200, true, 'Board deleted successfully', { board });
});

module.exports = { createBoard, getWorkspaceBoards, getBoardDetails, updateBoard, deleteBoard };
