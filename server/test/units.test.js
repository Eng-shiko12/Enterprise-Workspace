const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { oid } = require('./helpers');

const Workspace = require('../models/workSpaceModel');
const Task = require('../models/taskModel');
const Project = require('../models/ProjectModel');
const User = require('../models/userModel');
const escapeRegex = require('../utils/escapeRegex');
const { baseFromTitle } = require('../utils/projectKey');
const handleReorder = require('../utils/reorderUtil');
const sanitize = require('../middlewares/sanitizeMiddleware');
const { __test } = require('../controllers/workspaceController');

describe('models', () => {
    test('workspace gets an owner-independent unique slug before validation', async () => {
        const ws = new Workspace({ name: 'My Great Team!', owner: oid(), members: [] });
        await ws.validate();
        assert.match(ws.slug, /^my-great-team-[0-9a-f]{6}$/);
        const other = new Workspace({ name: 'My Great Team!', owner: oid() });
        await other.validate();
        assert.notEqual(ws.slug, other.slug);
    });

    test('task requires project, workspace and creator but not a description', async () => {
        const bad = new Task({ title: 'x' });
        await assert.rejects(() => bad.validate(), (e) => Boolean(e.errors.project));
        const ok = new Task({ title: 'x', project: oid(), workSpace: oid(), createdBy: oid() });
        await ok.validate();
        assert.equal(ok.points, 1);
        assert.equal(ok.status, 'todo');
    });

    test('task rejects invalid status values', async () => {
        const t = new Task({ title: 'x', status: 'finished', project: oid(), workSpace: oid(), createdBy: oid() });
        await assert.rejects(() => t.validate(), (e) => Boolean(e.errors.status));
    });

    test('user JSON never exposes credentials or OTP hashes', () => {
        const u = new User({ name: 'A', email: 'a@b.co', password: 'secret123', emailVerifyOTP: 'h', passwordResetOTP: 'h', lockUntil: new Date() });
        const json = u.toJSON();
        ['password', 'emailVerifyOTP', 'passwordResetOTP', 'lockUntil'].forEach((f) => assert.equal(json[f], undefined, f));
    });

    test('project title is required', async () => {
        await assert.rejects(() => new Project({ workSpace: oid(), createdBy: oid() }).validate(), (e) => Boolean(e.errors.title));
    });
});

describe('utils', () => {
    test('escapeRegex neutralises ReDoS / injection characters', () => {
        const re = new RegExp(escapeRegex('(a+)+$'));
        assert.ok(re.test('(a+)+$'));
        assert.equal(re.test('aaaa'), false);
    });

    test('issue keys derive from the project title', () => {
        assert.equal(baseFromTitle('Core Engine'), 'CE');
        assert.equal(baseFromTitle('Platform Core Engine'), 'PCE');
        assert.equal(baseFromTitle('Vortex'), 'VOR');
        assert.equal(baseFromTitle('123'), 'PRJ');
    });

    test('handleReorder is exported both ways and enforces scope', async () => {
        assert.equal(typeof handleReorder, 'function');
        assert.equal(handleReorder.handleReorder, handleReorder);
        const Model = { countDocuments: async () => 1 };
        await assert.rejects(() => handleReorder(Model, [oid(), oid()], {}), /do not belong/);
        await assert.rejects(() => handleReorder(Model, [], {}), /required/);
    });

    test('reorder writes sequential order numbers', async () => {
        let ops;
        const ids = [oid(), oid(), oid()];
        const Model = { countDocuments: async () => 3, bulkWrite: async (o) => { ops = o; } };
        await handleReorder(Model, ids, { list: 'L' });
        assert.deepEqual(ops.map((o) => o.updateOne.update.$set.order), [0, 1, 2]);
        assert.ok(ops.every((o) => o.updateOne.filter.list === 'L'));
    });

    test('sanitize strips mongo operators and dotted keys', () => {
        const req = { body: { ok: 1, $where: 'x', nested: { 'a.b': 1, fine: [{ $gt: 1, v: 2 }] } } };
        sanitize(req, {}, () => {});
        assert.deepEqual(req.body, { ok: 1, nested: { fine: [{ v: 2 }] } });
    });
});

describe('burndown', () => {
    const day = 24 * 60 * 60 * 1000;
    const start = new Date(Date.now() - 4 * day);
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(start.getTime() + 9 * day);
    const project = { startDate: start, endDate: end, createdAt: start };

    test('ideal goes linearly to zero and actual stops at today', () => {
        const tasks = [
            { points: 5, createdAt: start, completedAt: new Date(start.getTime() + 1.5 * day) },
            { points: 3, createdAt: start },
            { points: 2, createdAt: start }
        ];
        const b = __test.buildBurndown(project, tasks);
        assert.equal(b.days.length, 10);
        assert.equal(b.ideal[0], 10);
        assert.equal(b.ideal.at(-1), 0);
        assert.equal(b.actual[0], 10);          // nothing done on day 1
        assert.equal(b.actual[2], 5);           // the 5pt task finished on day 2
        assert.equal(b.actual.at(-1), null);    // future days are not plotted
        assert.equal(b.dayNumber, 5);
    });
});
