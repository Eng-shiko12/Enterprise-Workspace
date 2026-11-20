const day = 86_400_000
const iso = (offset) => new Date(Date.now() + offset * day).toISOString()

export const me = { _id: 'u1', name: 'Elena Rostova', email: 'elena@test.dev', avatar: '', createdAt: iso(-90) }
const bob = { _id: 'u2', name: 'Marcus Thorne', email: 'marcus@test.dev', avatar: '' }

export const workspace = {
  _id: 'w1', name: 'Vortex Core', description: 'Core platform team', myRole: 'owner',
  members: [
    { user: me, role: 'owner', status: 'active', joinedAt: iso(-90) },
    { user: bob, role: 'member', status: 'active', joinedAt: iso(-30) },
    { user: { _id: 'u3', name: 'Pending Pat', email: 'pat@test.dev' }, role: 'member', status: 'pending' },
  ],
}

export const projects = [
  { _id: 'p1', title: 'Sprint 24: Core Engine', key: 'COR', status: 'active', description: 'Cut p95 latency', startDate: iso(-9), endDate: iso(4), stats: { total: 3, done: 1, points: 13, donePoints: 5 } },
  { _id: 'p2', title: 'Sprint 25: Reliability', key: 'REL', status: 'planning', stats: { total: 0, done: 0, points: 0, donePoints: 0 } },
]

export const tasks = [
  { _id: 't1', key: 'COR-1', number: 1, title: 'OAuth 2.1 PKCE support', status: 'in_progress', priority: 'urgent', points: 8, labels: ['security'], assignedTo: me, createdBy: me, project: projects[0], dueDate: iso(1), description: 'Enforce PKCE', createdAt: iso(-5), updatedAt: iso(-1) },
  { _id: 't2', key: 'COR-2', number: 2, title: 'Rate limiter via Lua', status: 'review', priority: 'high', points: 5, labels: [], assignedTo: bob, createdBy: me, project: projects[0], createdAt: iso(-4), updatedAt: iso(-1) },
  { _id: 't3', key: 'COR-3', number: 3, title: 'Fix timezone parsing', status: 'done', priority: 'low', points: 5, labels: ['bug'], assignedTo: me, createdBy: me, project: projects[0], completedAt: iso(-2), createdAt: iso(-6), updatedAt: iso(-2) },
]

export const boards = [{ _id: 'b1', title: 'Product Roadmap', description: 'Quarterly', cardCount: 2, doneCount: 1, updatedAt: iso(-1) }]

export const boardDetail = {
  ...boards[0],
  lists: [
    { _id: 'l1', title: 'Ideas', cards: [{ _id: 'c1', title: 'Dark API explorer', list: 'l1', priority: 'medium', assignedTo: [bob] }] },
    { _id: 'l2', title: 'Shipped', cards: [] },
  ],
}

export const analytics = {
  totals: { projects: 2, tasks: 3, done: 1, points: 18, donePoints: 5, inProgressPoints: 8, reviewPoints: 5, overdue: 0, completionRate: 33, avgCycleDays: 2.4 },
  byStatus: [{ key: 'todo', name: 'To Do', count: 0 }, { key: 'in_progress', name: 'In Progress', count: 1 }, { key: 'review', name: 'In Review', count: 1 }, { key: 'done', name: 'Done', count: 1 }],
  byPriority: [{ key: 'urgent', name: 'Urgent', count: 1 }, { key: 'high', name: 'High', count: 1 }, { key: 'medium', name: 'Medium', count: 0 }, { key: 'low', name: 'Low', count: 1 }],
  workload: [{ user: me, openTasks: 1, openPoints: 8, donePoints: 5 }],
  velocity: [{ id: 'p1', title: 'Sprint 24', key: 'COR', committed: 18, completed: 5 }],
  burndown: { project: projects[0], days: ['2026-01-01', '2026-01-02'], ideal: [18, 0], actual: [18, 13], dayNumber: 2, daysTotal: 2 },
  attention: [{ _id: 't1', key: 'COR-1', title: 'OAuth 2.1 PKCE support', priority: 'urgent', project: 'p1', overdue: false }],
}
