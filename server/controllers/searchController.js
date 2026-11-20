const WorkSpace = require('../models/workSpaceModel');
const Board = require('../models/boardModel');
const Card = require('../models/cardModel');
const Task = require('../models/taskModel');
const asyncHandler = require('../utils/asyncHandler');
const escapeRegex = require('../utils/escapeRegex');
const sendResponse = require('../utils/sendResponse');

const TYPES = ['all', 'workspaces', 'boards', 'tasks', 'cards'];

// Searches only inside workspaces where the user is an ACTIVE member
exports.globalSearch = asyncHandler(async (req, res) => {
    const q = String(req.query.q || '').trim().slice(0, 80);
    const type = TYPES.includes(req.query.type) ? req.query.type : 'all';
    const empty = { workspaces: [], boards: [], tasks: [], cards: [] };

    if (q.length < 1) return sendResponse(res, 200, true, 'Search results', empty);

    const regex = new RegExp(escapeRegex(q), 'i');
    const userWorkspaces = await WorkSpace.find({
        members: { $elemMatch: { user: req.user._id, status: 'active' } }
    }).select('_id name');
    const workspaceIds = userWorkspaces.map((w) => w._id);

    const wants = (t) => type === 'all' || type === t;
    const [boards, tasks] = await Promise.all([
        wants('boards') || wants('cards')
            ? Board.find({ workSpace: { $in: workspaceIds }, isArchived: { $ne: true } }).select('title workSpace')
            : [],
        wants('tasks')
            ? Task.find({ workSpace: { $in: workspaceIds }, $or: [{ title: regex }, { key: regex }] })
                .select('title key status priority project workSpace').limit(8).lean()
            : []
    ]);

    const wsName = Object.fromEntries(userWorkspaces.map((w) => [w._id.toString(), w.name]));
    const boardMap = Object.fromEntries(boards.map((b) => [b._id.toString(), b]));

    const cards = wants('cards') && boards.length
        ? await Card.find({ board: { $in: boards.map((b) => b._id) }, title: regex, isArchived: { $ne: true } })
            .select('title board').limit(8).lean()
        : [];

    sendResponse(res, 200, true, 'Search results', {
        workspaces: wants('workspaces') ? userWorkspaces.filter((w) => regex.test(w.name)).slice(0, 5) : [],
        boards: wants('boards')
            ? boards.filter((b) => regex.test(b.title)).slice(0, 8).map((b) => ({ ...b.toObject(), workSpaceName: wsName[b.workSpace.toString()] }))
            : [],
        tasks: tasks.map((t) => ({ ...t, workSpaceName: wsName[t.workSpace.toString()] })),
        cards: cards.map((c) => {
            const board = boardMap[c.board.toString()];
            return { ...c, boardTitle: board.title, workSpace: board.workSpace };
        })
    });
});
