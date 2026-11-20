import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { AlertTriangle, BarChart3, CheckCircle2, Clock, Gauge, TrendingUp, Users } from 'lucide-react'
import PageHeader from '../../components/PageHeader'
import { Avatar, Badge, EmptyState, ErrorState, PriorityIcon, ProgressBar, Select, Skeleton, StatCard } from '../../components/ui'
import { useApi, useSocketEvent, useWorkspace } from '../../hooks'
import { getWorkspaceAnalytics } from '../../api/workspaceApi'
import { getErrorMessage } from '../../lib/errors'
import { formatDate } from '../../lib/format'

const STATUS_COLORS = { todo: '#64748b', in_progress: '#6366f1', review: '#fbbf24', done: '#22d3ee' }
const PRIORITY_COLORS = { urgent: '#f87171', high: '#fbbf24', medium: '#22d3ee', low: '#64748b' }

const axis = { stroke: 'var(--faint)', fontSize: 11, tickLine: false, axisLine: false }
const tooltipStyle = {
  contentStyle: { background: 'var(--card)', border: '1px solid var(--line-strong)', borderRadius: 10, fontSize: 12, color: 'var(--fg)' },
  labelStyle: { color: 'var(--muted)' },
  cursor: { fill: 'var(--raised)', opacity: 0.5 },
}

function Panel({ title, subtitle, icon: Icon, right, children, className = '' }) {
  return (
    <section className={`card p-5 ${className}`}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          {Icon && <Icon size={16} className="mt-0.5 text-accent" />}
          <div>
            <h2 className="text-sm font-semibold text-fg">{title}</h2>
            {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
          </div>
        </div>
        {right}
      </div>
      {children}
    </section>
  )
}

export default function Insights() {
  const { id, projects } = useWorkspace()
  const [projectId, setProjectId] = useState('')
  const { data, loading, error, reload } = useApi(() => getWorkspaceAnalytics(id, projectId), [id, projectId])

  useSocketEvent('taskUpdated', () => reload())
  useSocketEvent('taskCreated', () => reload())
  useSocketEvent('taskDeleted', () => reload())

  if (error) return <div className="mx-auto max-w-lg p-10"><ErrorState message={getErrorMessage(error)} onRetry={reload} /></div>
  if (loading || !data) {
    return <div className="space-y-4 p-6"><div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)}</div><Skeleton className="h-80" /></div>
  }
  if (data.totals.tasks === 0) {
    return <div className="mx-auto max-w-xl p-8"><EmptyState icon={BarChart3} title="No data to analyse yet" message="Add some issues to a project and your velocity, burndown and workload charts will appear here." action={<Link to={`/workspaces/${id}/backlog`} className="btn btn-primary">Go to backlog</Link>} /></div>
  }

  const { totals, burndown, velocity, workload, byStatus, byPriority, attention } = data
  const burnRows = burndown?.days.map((d, i) => ({ day: `D${i + 1}`, date: d, Ideal: burndown.ideal[i], Remaining: burndown.actual[i] })) || []
  const remaining = burndown ? [...burndown.actual].reverse().find((v) => v !== null) : null
  const idealToday = burndown && burndown.dayNumber ? burndown.ideal[Math.min(burndown.dayNumber, burndown.ideal.length) - 1] : null
  const ahead = remaining != null && idealToday != null ? Math.round((idealToday - remaining) * 10) / 10 : null
  const maxPts = Math.max(1, ...workload.map((w) => w.openPoints + w.donePoints))
  const statusData = byStatus.filter((s) => s.count > 0)

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5 p-4 sm:p-6">
      <PageHeader
        icon={TrendingUp}
        title="Team Velocity & Sprint Analytics"
        badge={<Badge className="bg-accent/15 text-accent"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />LIVE</Badge>}
        subtitle={`${totals.projects} project${totals.projects === 1 ? '' : 's'} · ${totals.tasks} issues · ${totals.points} story points`}
        actions={projects.length > 1 && (
          <div className="w-60"><Select value={projectId || burndown?.project._id || ''} onChange={(e) => setProjectId(e.target.value)} aria-label="Burndown project">{projects.map((p) => <option key={p._id} value={p._id}>{p.title}</option>)}</Select></div>
        )}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Completed points" value={totals.donePoints} unit={`/ ${totals.points} pts`} icon={Gauge} tone="text-accent"><ProgressBar className="mt-3" value={totals.points ? (totals.donePoints / totals.points) * 100 : 0} /></StatCard>
        <StatCard label="Cycle time" value={totals.avgCycleDays ?? '—'} unit={totals.avgCycleDays != null ? 'days (avg)' : 'no finished issues'} icon={Clock} />
        <StatCard label="Completion" value={`${totals.completionRate}%`} unit={`${totals.done}/${totals.tasks} issues`} icon={CheckCircle2} tone="text-ok" />
        <StatCard label="Overdue" value={totals.overdue} unit="open issues" icon={AlertTriangle} tone={totals.overdue ? 'text-danger' : 'text-fg'} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.7fr_1fr]">
        <Panel
          title={burndown ? `${burndown.project.title} — Burndown` : 'Burndown'}
          subtitle="Ideal trajectory vs. remaining story points"
          icon={TrendingUp}
          right={ahead !== null && <Badge className={ahead >= 0 ? 'bg-ok/15 text-ok' : 'bg-danger/15 text-danger'}>{ahead >= 0 ? `${ahead} pts ahead` : `${Math.abs(ahead)} pts behind`}</Badge>}
        >
          {burnRows.length ? (
            <div className="h-72">
              <ResponsiveContainer>
                <AreaChart data={burnRows} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <defs><linearGradient id="burn" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#22d3ee" stopOpacity={0.35} /><stop offset="100%" stopColor="#22d3ee" stopOpacity={0} /></linearGradient></defs>
                  <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="day" {...axis} interval="preserveStartEnd" />
                  <YAxis {...axis} allowDecimals={false} />
                  <Tooltip {...tooltipStyle} labelFormatter={(_, p) => (p?.[0] ? formatDate(p[0].payload.date) : '')} />
                  <Legend wrapperStyle={{ fontSize: 12, color: 'var(--muted)' }} />
                  <Line type="linear" dataKey="Ideal" stroke="var(--faint)" strokeDasharray="5 4" dot={false} strokeWidth={1.5} />
                  <Area type="monotone" dataKey="Remaining" stroke="#22d3ee" strokeWidth={2.5} fill="url(#burn)" connectNulls={false} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : <p className="py-16 text-center text-xs text-faint">Create a project with dates to see its burndown.</p>}
        </Panel>

        <Panel title="Velocity history" subtitle="Committed vs. completed points per project" icon={BarChart3}>
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart data={velocity.map((v) => ({ name: v.key || v.title.slice(0, 8), Committed: v.committed, Completed: v.completed }))} margin={{ top: 8, right: 4, left: -18, bottom: 0 }}>
                <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" {...axis} />
                <YAxis {...axis} allowDecimals={false} />
                <Tooltip {...tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 12, color: 'var(--muted)' }} />
                <Bar dataKey="Committed" fill="var(--line-strong)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Completed" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Panel title="Workload & capacity" subtitle="Open and finished story points per teammate" icon={Users}>
          <div className="space-y-4">
            {workload.length === 0 && <p className="py-6 text-center text-xs text-faint">No assigned work yet.</p>}
            {workload.map((w) => (
              <div key={w.user._id} className="flex items-center gap-3">
                <Avatar user={w.user} size={34} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between text-[13px]"><span className="truncate font-medium text-fg">{w.user.name}</span><span className="font-mono text-xs text-muted">{w.openPoints} open · {w.donePoints} done</span></div>
                  <div className="mt-1.5 flex h-2 overflow-hidden rounded-full bg-raised">
                    <div className="bg-brand" style={{ width: `${(w.openPoints / maxPts) * 100}%` }} />
                    <div className="bg-accent" style={{ width: `${(w.donePoints / maxPts) * 100}%` }} />
                  </div>
                  <p className="mt-1 text-[11px] text-faint">{w.openTasks} open issue{w.openTasks === 1 ? '' : 's'}</p>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <div className="space-y-5">
          <Panel title="Status distribution" icon={CheckCircle2}>
            <div className="flex items-center gap-4">
              <div className="h-36 w-36 shrink-0">
                <ResponsiveContainer><PieChart><Pie data={statusData} dataKey="count" nameKey="name" innerRadius={42} outerRadius={64} paddingAngle={3} stroke="none">{statusData.map((s) => <Cell key={s.key} fill={STATUS_COLORS[s.key]} />)}</Pie><Tooltip {...tooltipStyle} /></PieChart></ResponsiveContainer>
              </div>
              <ul className="flex-1 space-y-2 text-xs">{byStatus.map((s) => <li key={s.key} className="flex items-center justify-between"><span className="flex items-center gap-2 text-muted"><span className="h-2 w-2 rounded-full" style={{ background: STATUS_COLORS[s.key] }} />{s.name}</span><span className="font-mono text-fg">{s.count}</span></li>)}</ul>
            </div>
          </Panel>
          <Panel title="Priority mix" icon={AlertTriangle}>
            <div className="space-y-2.5">{byPriority.map((p) => <div key={p.key} className="flex items-center gap-3 text-xs"><span className="w-16 text-muted">{p.name}</span><div className="h-2 flex-1 overflow-hidden rounded-full bg-raised"><div className="h-full rounded-full" style={{ width: `${(p.count / Math.max(totals.tasks, 1)) * 100}%`, background: PRIORITY_COLORS[p.key] }} /></div><span className="w-6 text-right font-mono text-fg">{p.count}</span></div>)}</div>
          </Panel>
        </div>
      </div>

      <Panel title="Attention items" subtitle="Overdue or urgent issues that need eyes" icon={AlertTriangle}>
        {attention.length === 0 ? <p className="py-6 text-center text-xs text-faint">Nothing overdue or urgent — nice work. 🎉</p> : (
          <div className="divide-y divide-line">
            {attention.map((t) => (
              <Link key={t._id} to={`/workspaces/${id}/tasks/${t.project}/${t._id}`} className="flex items-center gap-3 py-3 transition hover:bg-raised/50">
                <PriorityIcon priority={t.priority} />
                <span className="w-16 font-mono text-xs text-accent">{t.key || '—'}</span>
                <span className="min-w-0 flex-1 truncate text-[13px] text-fg">{t.title}</span>
                <span className={`font-mono text-xs ${t.overdue ? 'text-danger' : 'text-warn'}`}>{t.overdue ? `Overdue · ${formatDate(t.dueDate)}` : 'Urgent'}</span>
              </Link>
            ))}
          </div>
        )}
      </Panel>
    </div>
  )
}
