const Project = require('../models/ProjectModel');
const Task = require('../models/taskModel');
const Comment = require('../models/commentModel');
const Board = require('../models/boardModel');
const List = require('../models/listModel');
const Card = require('../models/cardModel');
const ActivityLog = require('../models/activityLogModel');

const deleteTasksData = async (filter) => {
    const ids = await Task.find(filter).distinct('_id');
    if (ids.length) await Comment.deleteMany({ task: { $in: ids } });
    await Task.deleteMany(filter);
};

const deleteProjectData = async (projectId) => {
    await deleteTasksData({ project: projectId });
    await Project.deleteOne({ _id: projectId });
};

const deleteBoardData = async (boardId) => {
    await Card.deleteMany({ board: boardId });
    await List.deleteMany({ board: boardId });
    await Board.deleteOne({ _id: boardId });
};

const deleteWorkspaceData = async (workSpaceId) => {
    await deleteTasksData({ workSpace: workSpaceId });
    const boardIds = await Board.find({ workSpace: workSpaceId }).distinct('_id');
    await Card.deleteMany({ board: { $in: boardIds } });
    await List.deleteMany({ board: { $in: boardIds } });
    await Board.deleteMany({ workSpace: workSpaceId });
    await Project.deleteMany({ workSpace: workSpaceId });
    await ActivityLog.deleteMany({ workSpace: workSpaceId });
};

module.exports = { deleteProjectData, deleteBoardData, deleteWorkspaceData };
