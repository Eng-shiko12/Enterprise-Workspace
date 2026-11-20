const DAY = 86_400_000

export const initials = (name = '') =>
  name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || '?'

const PALETTE = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#ef4444', '#14b8a6']
export const colorFor = (seed = '') => {
  let h = 0
  for (let i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return PALETTE[h % PALETTE.length]
}

export const formatDate = (d, opts = { month: 'short', day: 'numeric' }) =>
  d ? new Date(d).toLocaleDateString('en-US', opts) : '—'

export const formatDateTime = (d) =>
  d ? new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—'

export const timeAgo = (d) => {
  if (!d) return ''
  const s = Math.max(1, Math.round((Date.now() - new Date(d)) / 1000))
  if (s < 60) return 'just now'
  const m = Math.round(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h}h ago`
  const days = Math.round(h / 24)
  if (days < 30) return `${days}d ago`
  return formatDate(d, { month: 'short', day: 'numeric', year: 'numeric' })
}

export const daysBetween = (a, b) => Math.round((new Date(b) - new Date(a)) / DAY)

/** Returns { label, tone } for a due date: overdue / today / tomorrow / future */
export const dueInfo = (date, done = false) => {
  if (!date) return null
  const d = new Date(date)
  const startToday = new Date()
  startToday.setHours(0, 0, 0, 0)
  const diff = Math.round((new Date(d).setHours(0, 0, 0, 0) - startToday) / DAY)
  if (done) return { label: formatDate(d), tone: 'text-faint' }
  if (diff < 0) return { label: `Overdue ${Math.abs(diff)}d`, tone: 'text-danger' }
  if (diff === 0) return { label: 'Due today', tone: 'text-warn' }
  if (diff === 1) return { label: 'Due tomorrow', tone: 'text-warn' }
  return { label: formatDate(d), tone: 'text-muted' }
}

export const toInputDate = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '')

export const isUrl = (s) => typeof s === 'string' && /^https?:\/\//.test(s)

export const taskKey = (t) => t?.key || (t?._id ? `#${t._id.slice(-4)}` : '')

/** Sprint timeline numbers derived from project dates */
export const sprintClock = (project) => {
  if (!project?.startDate || !project?.endDate) return null
  const total = Math.max(daysBetween(project.startDate, project.endDate) + 1, 1)
  const day = Math.min(Math.max(daysBetween(project.startDate, new Date()) + 1, 0), total)
  const left = Math.max(daysBetween(new Date(), project.endDate), 0)
  return { total, day, left }
}
