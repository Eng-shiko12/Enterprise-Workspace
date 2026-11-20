import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { DragDropContext, Droppable } from '@hello-pangea/dnd'
import { CheckCircle2, CircleDot, Eye, Filter, Gauge, LayoutGrid, List, Plus, Search, Target, Zap } from 'lucide-react'
import toast from 'react-hot-toast'
import PageHeader from '../../components/PageHeader'
import TaskCard from '../../components/TaskCard'
import TaskFormModal from '../../components/TaskFormModal'
import ProjectFormModal from '../../components/ProjectFormModal'
import { Avatar, Badge, Button, EmptyState, ErrorState, PriorityIcon, Select, Skeleton, StatCard, StatusPill } from '../../components/ui'
import { useApi, useAuth, useSocketEvent, useWorkspace } from '../../hooks'
import { getProjectTasks, updateTask } from '../../api/projectApi'
import { getErrorMessage } from '../../lib/errors'
import { PROJECT_STATUS_MAP, STATUSES } from '../../lib/constants'
import { dueInfo, formatDate, sprintClock, taskKey } from '../../lib/format'

const sum = (tasks) => tasks.reduce((s, t) => s + (t.points || 0), 0)

function PacingBars({ pct }) {
  const filled = Math.round(pct / 10)
  return (
    <div className="mt-2.5 flex gap-1" aria-hidden>
      {Array.from({ length: 10 }, (_, i) => (
        <span key={i} className={`h-4 flex-1 rounded-sm ${i < filled ? 'bg-accent' : 'bg-raised'}`} style={{ opacity: i < filled ? 0.45 + (i / 10) * 0.55 : 1 }} />
      ))}
    </div>
  )
}

function Chip({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
        active ? 'border-brand bg-brand/15 text-brand' : 'border-line bg-card text-muted hover:border-line-strong hover:text-fg'
      }`}
    >
      {children}
    </button>
  )
}

export default function ActiveSprint() {
  const { id, projects, members, isStaff } = useWorkspace()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [view, setView] = useState('board')
  const [filters, setFilters] = useState({ q: '', mine: false, high: false, assignee: null })
  const [adding, setAdding] = useState(null)
  const [projectModal, setProjectModal] = useState(false)

  const wanted = params.get('project')
  const projectId = projects.some((p) => p._id === wanted)
    ? wanted
    : (projects.find((p) => p.status === 'active') || projects[0])?._id
  const project = projects.find((p) => p._id === projectId)

  const { data, loading, error, reload, mutate } = useApi(() => getProjectTasks(id, projectId), [id, projectId], { enabled: Boolean(projectId) })
  const tasks = useMemo(() => data?.tasks || [], [data])

  const upsert = (task) =>
    mutate((d) => {
      const list = d?.tasks || []
      return { ...d, tasks: list.some((t) => t._id === task._id) ? list.map((t) => (t._id === task._id ? task : t)) : [task, ...list] }
    })

  // Realtime: keep the board in sync with teammates
  useSocketEvent('taskCreated', (p) => p.projectId === projectId && upsert(p.task))
  useSocketEvent('taskUpdated', (p) => p.projectId === projectId && upsert(p.task))
  useSocketEvent('taskDeleted', (p) => p.projectId === projectId && mutate((d) => ({ ...d, tasks: (d?.tasks || []).filter((t) => t._id !== p.taskId) })))

  const visible = useMemo(() => {
    const q = filters.q.trim().toLowerCase()
    return tasks.filter((t) => {
      if (q && !`${t.title} ${t.key || ''}`.toLowerCase().includes(q)) return false
      if (filters.mine && t.assignedTo?._id !== user._id) return false
      if (filters.high && !['high', 'urgent'].includes(t.priority)) return false
      if (filters.assignee && t.assignedTo?._id !== filters.assignee) return false
      return true
    })
  }, [tasks, filters, user._id])

  const stats = useMemo(() => {
    const by = (s) => tasks.filter((t) => t.status === s)
    const total = sum(tasks)
    const done = sum(by('done'))
    const completion = total ? Math.round((done / total) * 100) : 0
    const clock = sprintClock(project)
    const elapsed = clock ? Math.round((clock.day / clock.total) * 100) : null
    return { total, done, completion, flight: by('in_progress'), review: by('review'), clock, pace: elapsed === null ? null : completion - elapsed }
  }, [tasks, project])

  const onDragEnd = async ({ draggableId, destination, source }) => {
    if (!destination || destination.droppableId === source.droppableId) return
    const task = tasks.find((t) => t._id === draggableId)
    if (!task) return
    upsert({ ...task, status: destination.droppableId }) // optimistic
    try {
      const res = await updateTask(id, projectId, task._id, { status: destination.droppableId })
      upsert(res.task)
    } catch (err) {
      upsert(task) // roll back
      toast.error(getErrorMessage(err))
    }
  }

  const open = (t) => navigate(`/workspaces/${id}/tasks/${projectId}/${t._id}`)
  const anyFilter = filters.q || filters.mine || filters.high || filters.assignee

  if (projects.length === 0) {
    return (
      <div className="mx-auto max-w-xl p-8">
        <EmptyState
          icon={Zap}
          title="No sprint to show yet"
          message={isStaff ? 'Create your first project (a sprint or cycle) to start tracking issues on the board.' : 'An admin needs to create a project before issues can be tracked.'}
          action={isStaff && <Button variant="primary" icon={Plus} onClick={() => setProjectModal(true)}>Create project</Button>}
        />
        <ProjectFormModal open={projectModal} workspaceId={id} onClose={() => setProjectModal(false)} onSaved={(p) => setParams({ project: p._id })} />
      </div>
    )
  }

  return (
    <div className="flex min-h-full flex-col gap-5 p-4 sm:p-6">
      <PageHeader
        icon={Zap}
        title={project.title}
        badge={
          <>
            <Badge className={PROJECT_STATUS_MAP[project.status]?.pill}>
              {project.status === 'active' && <span className="h-1.5 w-1.5 rounded-full bg-accent" />}
              {project.status === 'active' && stats.clock ? `Active (Day ${stats.clock.day} of ${stats.clock.total})` : PROJECT_STATUS_MAP[project.status]?.label}
            </Badge>
            {project.key && <span className="font-mono text-xs text-faint">{project.key}</span>}
          </>
        }
        subtitle={project.description ? `Goal: ${project.description}` : project.startDate ? `${formatDate(project.startDate)} → ${formatDate(project.endDate)}` : undefined}
        actions={
          <>
            {projects.length > 1 && (
              <div className="w-56">
                <Select value={projectId} onChange={(e) => setParams({ project: e.target.value })} aria-label="Select project">
                  {projects.map((p) => <option key={p._id} value={p._id}>{p.title}</option>)}
                </Select>
              </div>
            )}
            <div className="flex rounded-lg border border-line bg-card p-0.5">
              {[['board', LayoutGrid, 'Board'], ['list', List, 'List']].map(([k, Icon, label]) => (
                <button key={k} onClick={() => setView(k)} className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${view === k ? 'bg-raised text-fg' : 'text-muted hover:text-fg'}`}>
                  <Icon size={13} />{label}
                </button>
              ))}
            </div>
            <Button variant="primary" icon={Plus} onClick={() => setAdding({})}>Add ticket</Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard label="Total scope" value={stats.total} unit={`pts (${tasks.length} issues)`} icon={Target} />
        <StatCard label="Completed" value={stats.done} unit={`pts (${stats.completion}%)`} icon={CheckCircle2} tone="text-accent" />
        <StatCard label="In flight" value={sum(stats.flight)} unit={`pts (${stats.flight.length} active)`} icon={CircleDot} tone="text-brand" />
        <StatCard label="In review" value={sum(stats.review)} unit={`pts (${stats.review.length} ${stats.review.length === 1 ? 'issue' : 'issues'})`} icon={Eye} tone="text-warn" />
        <StatCard label="Burndown pacing" value={stats.pace === null ? '—' : `${stats.pace >= 0 ? '+' : ''}${stats.pace}%`} unit={stats.pace === null ? 'set sprint dates' : stats.pace >= 0 ? 'ahead of plan' : 'behind plan'} icon={Gauge} tone={stats.pace !== null && stats.pace < 0 ? 'text-danger' : 'text-ok'} className="col-span-2 lg:col-span-1">
          <PacingBars pct={stats.completion} />
        </StatCard>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-64">
          <Search size={14} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-faint" />
          <input className="input pl-9" placeholder="Filter tickets…" value={filters.q} onChange={(e) => setFilters({ ...filters, q: e.target.value })} />
        </div>
        <div className="flex -space-x-1.5">
          {members.slice(0, 6).map((m) => (
            <button key={m._id} onClick={() => setFilters({ ...filters, assignee: filters.assignee === m._id ? null : m._id })} className={`rounded-full ring-2 transition ${filters.assignee === m._id ? 'z-10 ring-brand' : 'ring-app opacity-80 hover:opacity-100'}`} title={`Filter by ${m.name}`}>
              <Avatar user={m} size={28} />
            </button>
          ))}
        </div>
        <Chip active={filters.mine} onClick={() => setFilters({ ...filters, mine: !filters.mine })}>Only my issues</Chip>
        <Chip active={filters.high} onClick={() => setFilters({ ...filters, high: !filters.high })}>High priority</Chip>
        {anyFilter && (
          <button className="flex items-center gap-1 text-xs text-muted hover:text-fg" onClick={() => setFilters({ q: '', mine: false, high: false, assignee: null })}>
            <Filter size={12} /> Clear filters
          </button>
        )}
      </div>

      {error ? (
        <ErrorState message={getErrorMessage(error)} onRetry={reload} />
      ) : loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-72" />)}</div>
      ) : view === 'board' ? (
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="grid flex-1 items-start gap-4 pb-4 md:grid-cols-2 xl:grid-cols-4">
            {STATUSES.map((col) => {
              const items = visible.filter((t) => t.status === col.key)
              return (
                <div key={col.key} className="flex max-h-full flex-col rounded-2xl border border-line bg-panel p-3">
                  <div className="flex items-center justify-between px-1.5 pb-3">
                    <div className="flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${col.dot}`} />
                      <h3 className="text-[12px] font-bold tracking-wider text-fg uppercase">{col.label}</h3>
                      <span className="rounded bg-raised px-1.5 py-0.5 font-mono text-[10px] text-muted">{items.length}</span>
                    </div>
                    <span className="font-mono text-[11px] text-faint">{sum(items)} pts</span>
                  </div>
                  <Droppable droppableId={col.key}>
                    {(provided, snap) => (
                      <div ref={provided.innerRef} {...provided.droppableProps} className={`min-h-24 space-y-2.5 rounded-xl p-0.5 transition ${snap.isDraggingOver ? 'bg-brand/5' : ''}`}>
                        {items.map((t, i) => <TaskCard key={t._id} task={t} index={i} onOpen={open} />)}
                        {provided.placeholder}
                        {items.length === 0 && !snap.isDraggingOver && <p className="py-6 text-center text-xs text-faint">{anyFilter ? 'No matching issues' : 'Drop issues here'}</p>}
                      </div>
                    )}
                  </Droppable>
                  <button onClick={() => setAdding({ status: col.key })} className="mt-2 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs text-muted transition hover:bg-raised hover:text-fg">
                    <Plus size={14} /> Add item
                  </button>
                </div>
              )
            })}
          </div>
        </DragDropContext>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-[13px]">
            <thead>
              <tr className="border-b border-line text-faint">
                {['Key', 'Title', 'Status', 'Priority', 'Due', 'Points', 'Assignee'].map((h) => <th key={h} className="label px-4 py-3 font-semibold">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {visible.map((t) => {
                const due = dueInfo(t.dueDate, t.status === 'done')
                return (
                  <tr key={t._id} onClick={() => open(t)} className="cursor-pointer border-b border-line/60 transition last:border-0 hover:bg-raised/60">
                    <td className="px-4 py-3 font-mono text-xs text-muted">{taskKey(t)}</td>
                    <td className={`max-w-md truncate px-4 py-3 font-medium ${t.status === 'done' ? 'text-faint line-through' : 'text-fg'}`}>{t.title}</td>
                    <td className="px-4 py-3"><StatusPill status={t.status} /></td>
                    <td className="px-4 py-3"><PriorityIcon priority={t.priority} /></td>
                    <td className={`px-4 py-3 font-mono text-xs ${due?.tone || 'text-faint'}`}>{due?.label || '—'}</td>
                    <td className="px-4 py-3 font-mono text-xs">{t.points}</td>
                    <td className="px-4 py-3">{t.assignedTo ? <Avatar user={t.assignedTo} size={24} /> : <span className="text-faint">—</span>}</td>
                  </tr>
                )
              })}
              {visible.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-xs text-faint">No issues match your filters.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      <TaskFormModal open={Boolean(adding)} defaults={{ ...adding, projectId }} onClose={() => setAdding(null)} onCreated={(t) => t.project === projectId && upsert(t)} />
    </div>
  )
}
