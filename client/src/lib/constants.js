export const STATUSES = [
  { key: 'todo', label: 'To Do', dot: 'bg-slate-400', text: 'text-muted', pill: 'bg-slate-500/15 text-muted' },
  { key: 'in_progress', label: 'In Progress', dot: 'bg-brand', text: 'text-brand', pill: 'bg-brand/15 text-brand' },
  { key: 'review', label: 'In Review', dot: 'bg-warn', text: 'text-warn', pill: 'bg-warn/15 text-warn' },
  { key: 'done', label: 'Done', dot: 'bg-accent', text: 'text-accent', pill: 'bg-accent/15 text-accent' },
]
export const STATUS_MAP = Object.fromEntries(STATUSES.map((s) => [s.key, s]))

export const PRIORITIES = [
  { key: 'urgent', label: 'Urgent', level: 4, color: 'text-danger', pill: 'bg-danger/15 text-danger' },
  { key: 'high', label: 'High', level: 3, color: 'text-warn', pill: 'bg-warn/15 text-warn' },
  { key: 'medium', label: 'Medium', level: 2, color: 'text-accent', pill: 'bg-accent/15 text-accent' },
  { key: 'low', label: 'Low', level: 1, color: 'text-faint', pill: 'bg-slate-500/15 text-muted' },
]
export const PRIORITY_MAP = Object.fromEntries(PRIORITIES.map((p) => [p.key, p]))

export const POINT_OPTIONS = [0, 1, 2, 3, 5, 8, 13, 21]

export const PROJECT_STATUSES = [
  { key: 'active', label: 'Active cycle', pill: 'bg-accent/15 text-accent' },
  { key: 'planning', label: 'Upcoming', pill: 'bg-brand/15 text-brand' },
  { key: 'completed', label: 'Completed', pill: 'bg-ok/15 text-ok' },
]
export const PROJECT_STATUS_MAP = Object.fromEntries(PROJECT_STATUSES.map((s) => [s.key, s]))

export const ROLE_STYLES = {
  owner: 'bg-brand/15 text-brand',
  admin: 'bg-warn/15 text-warn',
  member: 'bg-slate-500/15 text-muted',
}

export const ACTIVITY_LABELS = {
  CREATE_WORKSPACE: 'created the workspace',
  INVITE_MEMBER: 'invited a member',
  CREATE_PROJECT: 'created project',
  DELETE_PROJECT: 'deleted project',
  CREATE_TASK: 'created',
  UPDATE_TASK: 'updated',
  DELETE_TASK: 'deleted',
  ADD_COMMENT: 'commented on',
  CREATE_BOARD: 'created board',
  UPDATE_BOARD: 'updated board',
  DELETE_BOARD: 'deleted board',
  CREATE_LIST: 'added list',
  UPDATE_LIST: 'updated list',
  DELETE_LIST: 'deleted list',
  REORDER_LIST: 'reordered lists',
  CREATE_CARD: 'added card',
  UPDATE_CARD: 'updated card',
  DELETE_CARD: 'deleted card',
  MOVE_CARD: 'moved card',
}
