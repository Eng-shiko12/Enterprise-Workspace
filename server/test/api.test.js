const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { oid, token, stubAuthUser, fakeWorkspace } = require('./helpers');
const request = require('supertest');

const app = require('../app');
const User = require('../models/userModel');
const WorkSpace = require('../models/workSpaceModel');
const ActivityLog = require('../models/activityLogModel');
const bcrypt = require('bcryptjs');

describe('platform endpoints', () => {
    test('GET /health is always 200', async () => {
        const res = await request(app).get('/health');
        assert.equal(res.status, 200);
        assert.equal(res.body.success, true);
    });

    test('GET /ready is 503 while the database is down', async () => {
        const res = await request(app).get('/ready');
        assert.equal(res.status, 503);
    });

    test('unknown routes return a JSON 404', async () => {
        const res = await request(app).get('/api/v1/nope');
        assert.equal(res.status, 404);
        assert.equal(res.body.success, false);
    });

    test('security headers are present and x-powered-by is hidden', async () => {
        const res = await request(app).get('/health');
        assert.ok(res.headers['x-content-type-options']);
        assert.equal(res.headers['x-powered-by'], undefined);
    });

    test('CORS only reflects configured origins', async () => {
        const ok = await request(app).get('/health').set('Origin', 'http://localhost:5173');
        const bad = await request(app).get('/health').set('Origin', 'https://evil.example');
        assert.equal(ok.headers['access-control-allow-origin'], 'http://localhost:5173');
        assert.equal(bad.headers['access-control-allow-origin'], undefined);
    });

    test('protected routes require authentication', async () => {
        for (const path of ['/api/v1/users/profile', '/api/v1/workspaces', '/api/v1/notifications', '/api/v1/search?q=a']) {
            const res = await request(app).get(path);
            assert.equal(res.status, 401, path);
        }
    });

    test('a forged token is rejected', async () => {
        const res = await request(app).get('/api/v1/users/profile').set('Authorization', 'Bearer not.a.jwt');
        assert.equal(res.status, 401);
    });
});

describe('input validation', () => {
    test('register rejects weak / malformed payloads', async () => {
        const res = await request(app).post('/api/v1/auth/register').send({ name: 'A', email: 'nope', password: '123' });
        assert.equal(res.status, 400);
        assert.match(res.body.message, /email/i);
    });

    test('login rejects NoSQL-injection objects', async () => {
        const res = await request(app).post('/api/v1/auth/login').send({ email: { $gt: '' }, password: { $gt: '' } });
        assert.equal(res.status, 400);
    });

    test('unknown fields are refused (mass-assignment guard)', async () => {
        const res = await request(app).post('/api/v1/auth/login').send({ email: 'a@b.co', password: 'x', role: 'admin' });
        assert.equal(res.status, 400);
    });

    test('OTP must be exactly 6 digits', async () => {
        const res = await request(app).post('/api/v1/auth/verify-email').send({ email: 'a@b.co', otp: '12ab' });
        assert.equal(res.status, 400);
    });
});

describe('login flow (stubbed database)', () => {
    let user;
    beforeEach(async () => {
        user = new User({ name: 'Ada', email: 'ada@example.com', password: await bcrypt.hash('correct-horse', 4) });
        user.save = async () => user;
        User.findOne = () => ({ select: async () => user });
    });

    test('valid credentials set an httpOnly cookie and never leak secrets', async () => {
        const res = await request(app).post('/api/v1/auth/login').send({ email: 'ada@example.com', password: 'correct-horse' });
        assert.equal(res.status, 200);
        const cookie = res.headers['set-cookie'][0];
        assert.match(cookie, /^jwt=/);
        assert.match(cookie, /HttpOnly/i);
        assert.match(cookie, /SameSite=Lax/i);
        assert.equal(res.body.data.user.password, undefined);
        assert.equal(res.body.data.user.emailVerifyOTP, undefined);
        assert.ok(res.body.token);
    });

    test('wrong password → 401 and failed attempts are counted', async () => {
        const res = await request(app).post('/api/v1/auth/login').send({ email: 'ada@example.com', password: 'wrong-password' });
        assert.equal(res.status, 401);
        assert.equal(user.failedLoginAttempts, 1);
    });

    test('5 failures lock the account (423)', async () => {
        for (let i = 0; i < 5; i += 1) {
            await request(app).post('/api/v1/auth/login').send({ email: 'ada@example.com', password: 'wrong-password' });
        }
        const res = await request(app).post('/api/v1/auth/login').send({ email: 'ada@example.com', password: 'correct-horse' });
        assert.equal(res.status, 423);
    });

    test('unverified accounts cannot log in', async () => {
        user.emailVerifyOTP = 'hash';
        const res = await request(app).post('/api/v1/auth/login').send({ email: 'ada@example.com', password: 'correct-horse' });
        assert.equal(res.status, 403);
    });
});

describe('workspace RBAC', () => {
    const me = oid();
    const auth = () => ({ Authorization: `Bearer ${token(me)}` });

    beforeEach(() => stubAuthUser(User, { _id: me, name: 'Me', isActive: true }));

    const withWorkspace = (ws) => { WorkSpace.findOne = async () => ws; };

    test('non-members get 404 (workspace ids cannot be probed)', async () => {
        withWorkspace(null);
        const res = await request(app).get(`/api/v1/workspaces/${oid()}`).set(auth());
        assert.equal(res.status, 404);
    });

    test('PENDING invitees are blocked from workspace data', async () => {
        withWorkspace(fakeWorkspace({ owner: oid(), members: [{ user: me, role: 'member', status: 'pending' }] }));
        const res = await request(app).get(`/api/v1/workspaces/${oid()}/projects`).set(auth());
        assert.equal(res.status, 403);
    });

    test('active members can read but not create projects', async () => {
        withWorkspace(fakeWorkspace({ owner: oid(), members: [{ user: me, role: 'member', status: 'active' }] }));
        const id = oid();
        const create = await request(app).post(`/api/v1/workspaces/${id}/projects`).set(auth()).send({ title: 'Roadmap' });
        assert.equal(create.status, 403);
    });

    test('members cannot delete a workspace; only owners can', async () => {
        withWorkspace(fakeWorkspace({ owner: oid(), members: [{ user: me, role: 'admin', status: 'active' }] }));
        const res = await request(app).delete(`/api/v1/workspaces/${oid()}`).set(auth());
        assert.equal(res.status, 403);
    });

    test('only the owner may hand out the admin role', async () => {
        withWorkspace(fakeWorkspace({ owner: oid(), members: [{ user: me, role: 'admin', status: 'active' }] }));
        const res = await request(app).post(`/api/v1/workspaces/${oid()}/invite`).set(auth()).send({ email: 'x@y.co', role: 'admin' });
        assert.equal(res.status, 403);
    });

    test('leave-workspace is reachable for members (was permanently 401 before)', async () => {
        const ws = fakeWorkspace({ owner: oid(), members: [{ user: me, role: 'member', status: 'active' }] });
        withWorkspace(ws);
        const Task = require('../models/taskModel');
        Task.updateMany = async () => ({});
        const res = await request(app).delete(`/api/v1/workspaces/${oid()}/leave`).set(auth());
        assert.equal(res.status, 200);
        assert.equal(ws.members.length, 0);
    });

    test('the owner cannot leave their own workspace', async () => {
        withWorkspace(fakeWorkspace({ owner: me, members: [{ user: me, role: 'owner', status: 'active' }] }));
        const res = await request(app).delete(`/api/v1/workspaces/${oid()}/leave`).set(auth());
        assert.equal(res.status, 400);
    });

    test('creating a workspace persists owner + active owner membership', async () => {
        let payload;
        ActivityLog.create = async () => ({});
        WorkSpace.create = async (data) => { payload = data; return { _id: oid(), ...data }; };
        const res = await request(app).post('/api/v1/workspaces').set(auth()).send({ name: 'Launch Team' });
        assert.equal(res.status, 201);
        assert.equal(String(payload.owner), String(me));
        assert.deepEqual([payload.members[0].role, payload.members[0].status], ['owner', 'active']);
    });
});

describe('error mapping', () => {
    const errorHandler = require('../middlewares/errorMiddleware');
    const run = (err) => {
        let out = {};
        const res = { status(c) { out.status = c; return this; }, json(b) { out.body = b; } };
        errorHandler(err, {}, res, () => {});
        return out;
    };
    const named = (name, extra = {}) => Object.assign(new Error(name), { name }, extra);

    test('JWT, cast, validation and duplicate errors become clean 4xx responses', () => {
        assert.equal(run(named('JsonWebTokenError')).status, 401);
        assert.equal(run(named('TokenExpiredError')).status, 401);
        assert.equal(run(named('CastError', { path: '_id', value: 'zzz' })).status, 400);
        assert.equal(run(named('ValidationError', { errors: { a: { message: 'bad' } } })).status, 400);
        assert.equal(run(Object.assign(new Error('dup'), { code: 11000, keyValue: { email: 'a' } })).body.message, 'That email is already in use');
    });

    test('unexpected errors do not leak internals in production', () => {
        const prev = process.env.NODE_ENV;
        process.env.NODE_ENV = 'production';
        const out = run(new Error('db password is hunter2'));
        process.env.NODE_ENV = prev;
        assert.equal(out.status, 500);
        assert.doesNotMatch(out.body.message, /hunter2/);
    });
});
