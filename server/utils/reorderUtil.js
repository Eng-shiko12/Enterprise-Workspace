const createError = require('./AppError');

/**
 * Atomically re-number a set of siblings (cards in a list / lists in a board).
 * Every id must belong to the supplied parent scope, which prevents IDOR reordering.
 *
 * @param {Model}  Model        Mongoose model (Card | List)
 * @param {Array}  orderedIds   ids in their new order
 * @param {Object} scopeQuery   e.g. { board: boardId } or { list: listId }
 */
const handleReorder = async (Model, orderedIds, scopeQuery = {}) => {
    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
        throw createError('An ordered array of ids is required', 400);
    }

    const found = await Model.countDocuments({ _id: { $in: orderedIds }, ...scopeQuery });
    if (found !== orderedIds.length) {
        throw createError('One or more items do not belong to the target container', 403);
    }

    await Model.bulkWrite(
        orderedIds.map((id, index) => ({
            updateOne: { filter: { _id: id, ...scopeQuery }, update: { $set: { order: index } } }
        }))
    );
    return true;
};

module.exports = handleReorder;
module.exports.handleReorder = handleReorder;
