const ActivityLog = require('../models/activityLogModel');

const logActivity = async ({ workSpaceId, boardId = null, cardId = null, actorId, actionType, details = {} }) => {
    try {
        await ActivityLog.create({
            workSpace: workSpaceId,
            board: boardId,
            card: cardId,
            actor: actorId,
            actionType,
            details
        });
    } catch (error) {
        console.error('Error logging activity:', error.message);
    }
};

module.exports = logActivity;