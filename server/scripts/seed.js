/**
 * Demo data seeder:  npm run seed            (skips if the demo user already exists)
 *                    npm run seed -- --reset (wipes the previous demo workspace first)
 *
 * Login afterwards with   demo@vortex.dev  /  Demo@12345
 */
const mongoose = require('mongoose');
const { config, validateEnv } = require('../config/env');
const User = require('../models/userModel');
const Workspace = require('../models/workSpaceModel');
const Project = require('../models/ProjectModel');
const Task = require('../models/taskModel');
const Comment = require('../models/commentModel');
const Board = require('../models/boardModel');
const List = require('../models/listModel');
const Card = require('../models/cardModel');
const { deleteWorkspaceData } = require('../utils/cascade');

const DAY = 24 * 60 * 60 * 1000;
const DEMO_EMAIL = 'demo@vortex.dev';
const PASSWORD = 'Demo@12345';

const people = [
    { name: 'Elena Rostova', email: DEMO_EMAIL },
    { name: 'Marcus Thorne', email: 'marcus@vortex.dev' },
    { name: 'Sarah Kim', email: 'sarah@vortex.dev' },
    { name: 'David Lin', email: 'david@vortex.dev' },
    { name: 'Maya Patel', email: 'maya@vortex.dev' }
];

// [title, status, priority, points, assignee index, labels, day (relative to sprint start) the task was finished]
const sprintTasks = [
    ['Database read-replica auto-scaling based on p99 latency', 'done', 'high', 5, 3, ['infra'], 2],
    ['Upgrade Vite to v5.2 and enable runner parallelization', 'done', 'medium', 3, 2, ['frontend'], 3],
    ['Fix timezone offset parsing in recurring meeting sync', 'done', 'medium', 2, 1, ['bug'], 4],
    ['Add audit trail export to CSV', 'done', 'low', 3, 4, ['backend'], 5],
    ['Rotate signing keys without downtime', 'done', 'high', 5, 0, ['security'], 6],
    ['OAuth 2.1 PKCE support for third-party CLI tooling', 'in_progress', 'urgent', 8, 0, ['security', 'auth'], null],
    ['Refactor GraphQL subscriptions connection manager memory leak', 'in_progress', 'high', 5, 1, ['backend'], null],
    ['Micro-animations for drag-and-drop ticket reordering', 'in_progress', 'low', 3, 2, ['frontend'], null],
    ['Rate limiter sliding window implementation via Lua scripts', 'review', 'high', 5, 4, ['infra'], null],
    ['Workspace member invitation email template redesign', 'review', 'low', 3, 2, ['frontend'], null],
    ['Migrate auth session store from Redis cluster to DragonflyDB', 'todo', 'high', 3, 3, ['infra'], null],
    ['Implement bi-directional Webhook retries with exponential backoff', 'todo', 'medium', 5, 1, ['backend'], null],
    ['Design system dark mode token audit for typography scale', 'todo', 'low', 2, 2, ['design'], null]
];

const upcomingTasks = [
    ['Automated rollback mechanism for canary deployment failures', 'high', 8, 3, ['infra']],
    ['Multi-tenant organization billing usage telemetry pipeline', 'high', 5, 4, ['analytics']],
    ['Customer export to CSV and JSON schema v2', 'medium', 3, null, ['dx']],
    ['Mobile responsive audit for tablet viewports', 'low', 2, 2, ['frontend']]
];

const run = async () => {
    validateEnv();
    await mongoose.connect(config.mongoUri);

    const existing = await User.findOne({ email: DEMO_EMAIL });
    if (existing && !process.argv.includes('--reset')) {
        console.log('Demo data already present. Use `npm run seed -- --reset` to rebuild it.');
        return;
    }
    if (existing) {
        const old = await Workspace.find({ owner: existing._id });
        for (const ws of old) { await deleteWorkspaceData(ws._id); await Workspace.deleteOne({ _id: ws._id }); }
        await User.deleteMany({ email: { $in: people.map((p) => p.email) } });
    }

    const users = [];
    for (const p of people) users.push(await User.create({ ...p, password: PASSWORD }));
    const owner = users[0];

    const workspace = await Workspace.create({
        name: 'Vortex Core',
        description: 'Core engine, platform and developer experience teams.',
        owner: owner._id,
        members: users.map((u, i) => ({ user: u._id, role: i === 0 ? 'owner' : i === 1 ? 'admin' : 'member', status: 'active' }))
    });

    // ── Active sprint (day 10 of 14) ──
    const start = new Date(Date.now() - 9 * DAY);
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(start.getTime() + 13 * DAY);

    const sprint = await Project.create({
        title: 'Sprint 24: Core Engine Optimization',
        description: 'Eliminate latency spikes in session manager & upgrade edge pipelines.',
        status: 'active', key: 'COR', startDate: start, endDate: end,
        workSpace: workspace._id, createdBy: owner._id
    });
    const next = await Project.create({
        title: 'Sprint 25: Reliability & Billing',
        description: 'Canary rollbacks and billing telemetry.',
        status: 'planning', key: 'REL', startDate: new Date(end.getTime() + DAY), endDate: new Date(end.getTime() + 15 * DAY),
        workSpace: workspace._id, createdBy: owner._id
    });

    let n = 0;
    const created = [];
    for (const [title, status, priority, points, who, labels, finishedDay] of sprintTasks) {
        n += 1;
        const createdAt = new Date(start.getTime() + (n % 3) * 0.4 * DAY);
        const task = await Task.create({
            title, status, priority, points, labels, key: `COR-${n}`, number: n,
            description: `Technical notes for “${title}”.\n\nAcceptance criteria and rollout plan live in the project wiki.`,
            project: sprint._id, workSpace: workspace._id, assignedTo: users[who]._id, createdBy: owner._id,
            dueDate: new Date(Date.now() + ((n % 6) - 1) * DAY),
            completedAt: finishedDay ? new Date(start.getTime() + finishedDay * DAY) : undefined
        });
        await Task.collection.updateOne({ _id: task._id }, { $set: { createdAt } });
        created.push(task);
    }
    await Project.updateOne({ _id: sprint._id }, { taskCounter: n });

    let m = 0;
    for (const [title, priority, points, who, labels] of upcomingTasks) {
        m += 1;
        await Task.create({
            title, priority, points, labels, key: `REL-${m}`, number: m, project: next._id, workSpace: workspace._id,
            assignedTo: who === null ? undefined : users[who]._id, createdBy: owner._id
        });
    }
    await Project.updateOne({ _id: next._id }, { taskCounter: m });

    const oauth = created.find((t) => t.title.startsWith('OAuth'));
    await Comment.create([
        { task: oauth._id, user: users[0]._id, content: 'Initial token exchange and code verifier verification is working on the local stage container. Windows Credential Manager needs the DPAPI-NG wrapper.' },
        { task: oauth._id, user: users[1]._id, content: 'Approved the PR from an architecture standpoint. Let’s make sure the CLI prints a manual copy/paste URL on headless SSH instances.' }
    ]);

    // ── Kanban board ──
    const board = await Board.create({ title: 'Product Roadmap', description: 'Quarterly planning board', workSpace: workspace._id });
    const lists = await List.insertMany(['Ideas', 'Planned', 'Building', 'Shipped'].map((title, order) => ({ title, order, board: board._id })));
    const cards = [
        [0, 'Dark-mode API explorer', 'medium'], [0, 'Public status page', 'low'],
        [1, 'Audit log streaming', 'high'], [2, 'Realtime presence on boards', 'high'], [3, 'Single sign-on (SAML)', 'urgent']
    ];
    for (const [i, [li, title, priority]] of cards.entries()) {
        await Card.create({ title, priority, list: lists[li]._id, board: board._id, order: i, assignedTo: [users[i % users.length]._id] });
    }

    console.log('\n✅ Demo data created');
    console.log(`   Workspace : ${workspace.name}`);
    console.log(`   Login     : ${DEMO_EMAIL}  /  ${PASSWORD}`);
    console.log('   (teammates use the same password: marcus@, sarah@, david@, maya@vortex.dev)\n');
};

run()
    .catch((err) => { console.error('Seed failed:', err); process.exitCode = 1; })
    .finally(() => mongoose.disconnect());
