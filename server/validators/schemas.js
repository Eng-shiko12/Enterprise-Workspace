const Joi = require('joi');

const id = Joi.string().hex().length(24);
const email = Joi.string().trim().lowercase().email().max(254);
const text = (max, min = 0) => Joi.string().trim().allow('').min(min).max(max);
const date = Joi.date().iso().allow(null, '');

const STATUS = ['todo', 'in_progress', 'review', 'done'];
const PRIORITY = ['low', 'medium', 'high', 'urgent'];

const partial = (obj) => Joi.object(obj).min(1);

// ─── Auth ────────────────────────────────────────────────────────────
exports.register = Joi.object({
    name: Joi.string().trim().min(2).max(60).required(),
    email: email.required(),
    password: Joi.string().min(8).max(128).required()
});
exports.login = Joi.object({ email: email.required(), password: Joi.string().max(128).required() });
exports.emailOnly = Joi.object({ email: email.required() });
exports.otp = Joi.object({ email: email.required(), otp: Joi.string().trim().pattern(/^\d{6}$/).required()
    .messages({ 'string.pattern.base': 'OTP must be a 6 digit code' }) });
exports.resetPassword = Joi.object({ email: email.required(), password: Joi.string().min(8).max(128).required() });

// ─── Users ───────────────────────────────────────────────────────────
exports.updateProfile = partial({
    name: Joi.string().trim().min(2).max(60),
    avatar: Joi.string().trim().uri({ scheme: ['http', 'https'] }).max(500).allow('')
});
exports.changePassword = Joi.object({
    currentPassword: Joi.string().max(128).required(),
    newPassword: Joi.string().min(8).max(128).required()
});

// ─── Workspaces ──────────────────────────────────────────────────────
exports.workspace = Joi.object({ name: Joi.string().trim().min(2).max(80).required(), description: text(500) });
exports.workspaceUpdate = partial({ name: Joi.string().trim().min(2).max(80), description: text(500) });
exports.invite = Joi.object({ email: email.required(), role: Joi.string().valid('admin', 'member').default('member') });
exports.memberRole = Joi.object({ role: Joi.string().valid('admin', 'member').required() });
exports.inviteResponse = Joi.object({ response: Joi.string().valid('accept', 'decline').required() });

// ─── Projects & tasks ────────────────────────────────────────────────
const projectFields = {
    title: Joi.string().trim().min(2).max(100),
    description: text(1000),
    status: Joi.string().valid('planning', 'active', 'completed'),
    startDate: date,
    endDate: date,
    key: Joi.string().trim().uppercase().pattern(/^[A-Z][A-Z0-9]{1,4}$/)
};
exports.project = Joi.object({ ...projectFields, title: projectFields.title.required() });
const { key: _immutableKey, ...updatableProjectFields } = projectFields;
exports.projectUpdate = partial(updatableProjectFields);

const taskFields = {
    title: Joi.string().trim().min(1).max(200),
    description: text(10000),
    status: Joi.string().valid(...STATUS),
    priority: Joi.string().valid(...PRIORITY),
    assignedTo: id.allow(null, ''),
    dueDate: date,
    points: Joi.number().integer().min(0).max(100),
    labels: Joi.array().items(Joi.string().trim().min(1).max(24)).max(10)
};
exports.task = Joi.object({ ...taskFields, title: taskFields.title.required() });
exports.taskUpdate = partial(taskFields);
exports.comment = Joi.object({ content: Joi.string().trim().min(1).max(5000).required() });

// ─── Boards ──────────────────────────────────────────────────────────
const boardFields = {
    title: Joi.string().trim().min(1).max(100),
    description: text(500),
    background: Joi.string().trim().max(200).allow(''),
    isPrivate: Joi.boolean(),
    isArchived: Joi.boolean()
};
exports.board = Joi.object({ ...boardFields, title: boardFields.title.required() });
exports.boardUpdate = partial(boardFields);
exports.list = Joi.object({ title: Joi.string().trim().min(1).max(100).required() });
exports.listUpdate = partial({ title: Joi.string().trim().min(1).max(100), isArchived: Joi.boolean() });
exports.reorder = Joi.object({ lists: Joi.array().items(id).min(1), cards: Joi.array().items(id).min(1) }).xor('lists', 'cards');

const cardFields = {
    title: Joi.string().trim().min(1).max(200),
    description: text(5000),
    priority: Joi.string().valid(...PRIORITY),
    dueDate: date,
    assignedTo: Joi.array().items(id).max(20),
    labels: Joi.array().items(Joi.object({ name: Joi.string().trim().max(24), color: Joi.string().trim().max(20) })).max(10),
    isCompleted: Joi.boolean(),
    isArchived: Joi.boolean()
};
exports.card = Joi.object({ ...cardFields, title: cardFields.title.required() });
exports.cardUpdate = partial(cardFields);
exports.cardMove = Joi.object({ listId: id.required(), index: Joi.number().integer().min(0).required() });

exports.constants = { STATUS, PRIORITY };
