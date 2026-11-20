const jwt = require('jsonwebtoken');
const cookie = require('cookie');
const { Server } = require('socket.io');
const WorkSpace = require('../models/workSpaceModel');
const Board = require('../models/boardModel');
const { config } = require('../config/env');

let ioInstance = null;

const extractToken = (socket) => {
    const authToken = socket.handshake.auth?.token;
    if (authToken) return authToken;

    const rawCookie = socket.handshake.headers?.cookie;
    if (!rawCookie) return null;

    const parsed = cookie.parse(rawCookie);
    return parsed.jwt && parsed.jwt !== 'loggedout' ? parsed.jwt : null;
};

const isActiveMember = (workspaceId, userId) =>
    WorkSpace.exists({
        _id: workspaceId,
        members: { $elemMatch: { user: userId, status: 'active' } }
    });

const initSocket = (server) => {
    if (!process.env.JWT_SECRET) {
        throw new Error('FATAL ERROR: JWT_SECRET environment variable is missing.');
    }

    const io = new Server(server, {
        cors: { origin: config.clientOrigins, credentials: true },
        pingTimeout: 30000
    });

    // 1. Authenticate every connection with the same JWT used by the REST API
    io.use((socket, next) => {
        try {
            const token = extractToken(socket);
            if (!token) return next(new Error('Authentication error: token missing'));
            socket.user = jwt.verify(token, process.env.JWT_SECRET);
            next();
        } catch {
            next(new Error('Authentication error: invalid or expired token'));
        }
    });

    io.on('connection', (socket) => {
        // Private room used for notifications addressed to this user
        socket.join(`user_${socket.user.id}`);

        // 2. Verified room joining — a user can only listen to rooms they belong to
        socket.on('joinWorkspace', async (workspaceId) => {
            try {
                if (!(await isActiveMember(workspaceId, socket.user.id))) {
                    return socket.emit('socketError', { message: 'Access denied to this workspace' });
                }
                socket.join(`workspace_${workspaceId}`);
                socket.emit('joinedWorkspace', { workspaceId });
            } catch {
                socket.emit('socketError', { message: 'Could not join workspace room' });
            }
        });

        socket.on('joinBoard', async (boardId) => {
            try {
                const board = await Board.findById(boardId).select('workSpace');
                if (!board || !(await isActiveMember(board.workSpace, socket.user.id))) {
                    return socket.emit('socketError', { message: 'Access denied to this board' });
                }
                socket.join(`board_${boardId}`);
                socket.emit('joinedBoard', { boardId });
            } catch {
                socket.emit('socketError', { message: 'Could not join board room' });
            }
        });

        socket.on('leaveWorkspace', (id) => socket.leave(`workspace_${id}`));
        socket.on('leaveBoard', (id) => socket.leave(`board_${id}`));
    });

    ioInstance = io;
    return io;
};

const getIO = () => {
    if (!ioInstance) throw new Error('Socket.io has not been initialized. Call initSocket(server) first.');
    return ioInstance;
};

// Safe emit helpers: never throw (e.g. in tests or before the socket server is ready)
const emitTo = (room, event, payload) => {
    if (ioInstance) ioInstance.to(room).emit(event, payload);
};
const emitToWorkspace = (id, event, payload) => emitTo(`workspace_${id}`, event, payload);
const emitToBoard = (id, event, payload) => emitTo(`board_${id}`, event, payload);
const emitToUser = (id, event, payload) => emitTo(`user_${id}`, event, payload);

module.exports = { initSocket, getIO, emitToWorkspace, emitToBoard, emitToUser };
