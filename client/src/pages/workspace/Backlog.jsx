import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, ChevronRight, Flag, LayoutList, MoreVertical, Pencil, Play, Plus, CheckCheck, Search, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import PageHeader from '../../components/PageHeader'
import ProjectFormModal from '../../components/ProjectFormModal'
import { Avatar, Badge, Button, EmptyState, ErrorState, IconButton, Menu, PriorityIcon, ProgressBar, Skeleton, StatusPill } from '../../components/ui'
import { useApi, useConfirm, useSocketEvent, useWorkspace } from '../../hooks'
import { createTask, deleteProject, getWorkspaceTasks, updateProject } from '../../api/projectApi'
import { getErrorMessage } from '../../lib/errors'
import { PROJECT_STATUS_MAP, STATUSES } from '../../lib/constants'
import { formatDate, sprintClock, taskKey } from '../../lib/format'

const ORDER = { active: 0, planning: 1, completed: 2 }
const sum = (tasks) => tasks.reduce((s, t) => s + (t.points || 0), 0)

function QuickAdd({ workspaceId, project, onCreated }) {
  const [title, setTitle] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (!title.trim()) return
    setBusy(true)
    try {
      const { task } = await createTask(workspaceId, project._id, { title: title.trim() })
      setTitle('')
      onCreated(task)
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex items-center gap-2 border-t border-line/60 px-4 py-2.5">
      <Plus size={14} className="text-faint" />
      <input
        value={title}
        disabled={busy}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={200}
        placeholder={`Add issue to ${project.title}…  (press Enter)`}
        className="flex-1 bg-transparent text-[13px] text-fg outline-none placeholder:text-faint"
      />
    </form>
  )
}

function Section({ project, tasks, isStaff, isOwner, onAdd, onEdit, onStatus, onDelete, defaultOpen, filterActive }) {
  const { id } = useWorkspace()
  const navigate = useNavigate()
  const [open, setOpen] = useState(defaultOpen)
  const clock = sprintClock(project)
  const stats = project.stats || {}
  const pct = stats.points ? Math.round((stats.donePoints / stats.points) * 100) : 0
  const sorted = [...tasks].sort((a, b) => (a.status === 'done') - (b.status === 'done') || a.number - b.number)

  const menu = [
    { label: 'Start sprint', icon: Play, hidden: !isStaff || project.status !== 'planning', onClick: () => onStatus(project, 'active') },
    { label: 'Complete sprint', icon: CheckCheck, hidden: !isStaff || project.status !== 'active', onClick: () => onStatus(project, 'completed') },
    { label: 'Reopen', icon: Play, hidden: !isStaff || project.status !== 'completed', onClick: () => onStatus(project, 'active') },
    { label: 'Edit details', icon: Pencil, hidden: !isStaff, onClick: () => onEdit(project) },
    { label: 'Delete project', icon: Trash2, danger: true, hidden: !isOwner, onClick: () => onDelete(project) },
  ]

  return (
    <section className="card overflow-hidden">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3.5">
        <button onClick={() => setOpen((o) => !o)} className="flex min-w-0 items-center gap-2.5 text-left">
          {open ? <ChevronDown size={16} className="text-muted" /> : <ChevronRight size={16} className="text-muted" />}
          <h2 className="truncate text-[15px] font-semibold text-fg">{project.title}</h2>
          <Badge className={PROJECT_STATUS_MAP[project.status]?.pill}>{PROJECT_STATUS_MAP[project.status]?.label}</Badge>
        </button>
        <span className="text-xs text-muted">{stats.total || 0} issues • {stats.points || 0} pts{project.status === 'planning' ? ' committed' : ''}</span>
        <div className="hidden w-28 sm:block"><ProgressBar value={pct} /></div>
        <span className="font-mono text-[11px] text-faint">{pct}%</span>
        <div className="ml-auto flex items-center gap-3">
          {project.status === 'active' && clock && (
            <span className="rounded-lg border border-line bg-raised px-2.5 py-1 text-xs text-muted">Ends in <b className="text-fg">{clock.left} days</b> ({formatDate(project.endDate)})</span>
          )}
          {project.status === 'planning' && project.startDate && <span className="text-xs text-muted">Starts {formatDate(project.startDate)}</span>}
          {menu.some((m) => !m.hidden) && <Menu items={menu} trigger={<IconButton label="Project actions"><MoreVertical size={16} /></IconButton>} />}
        </div>
      </div>

      {open && (
        <>
          {project.description && (
            <p className="flex items-center gap-2 border-t border-line/60 bg-raised/40 px-4 py-2 text-[12px] text-muted">
              <Flag size={13} className="text-brand" /> <b className="text-fg">Goal:</b> {project.description}
            </p>
          )}
          {sorted.map((t) => (
            <div key={t._id} onClick={() => navigate(`/workspaces/${id}/tasks/${project._id}/${t._id}`)} className="group flex cursor-pointer items-center gap-3 border-t border-line/60 px-4 py-2.5 transition hover:bg-raised/60">
              <PriorityIcon priority={t.priority} />
              <span className="w-16 shrink-0 font-mono text-[11px] text-muted">{taskKey(t)}</span>
              <span className={`min-w-0 flex-1 truncate text-[13px] ${t.status === 'done' ? 'text-faint line-through' : 'text-fg'}`}>{t.title}</span>
              <span className="hidden gap-1.5 md:flex">
                {(t.labels || []).slice(0, 2).map((l) => <span key={l} className="rounded bg-brand/10 px-1.5 py-0.5 font-mono text-[10px] text-brand">#{l}</span>)}
              </span>
              <StatusPill status={t.status} />
              <span className="w-6 text-center font-mono text-xs text-muted">{t.points}</span>
              {t.assignedTo ? <Avatar user={t.assignedTo} size={24} /> : <span className="h-6 w-6 rounded-full border border-dashed border-line-strong" />}
            </div>
          ))}
          {sorted.length === 0 && <p className="border-t border-line/60 px-4 py-6 text-center text-xs text-faint">{filterActive ? 'No issues match your filters.' : 'No issues in this project yet.'}</p>}
          <QuickAdd workspaceId={id} project={project} onCreated={onAdd} />
        </>
      )}
    </section>
  )
}

export default function Backlog() {
  const { id, projects, isStaff, isOwner, reload: reloadWorkspace } = useWorkspace()
  const confirm = useConfirm()
  const { data, loading, error, reload, mutate } = useApi(() => getWorkspaceTasks(id), [id])
  const [filters, setFilters] = useState({ q: '', status: '' })
  const [modal, setModal] = useState(null) // { project? }

  const tasks = useMemo(() => data?.tasks || [], [data])

  const upsert = (task) =>
    mutate((d) => {
      const list = d?.tasks || []
      const withProject = { ...task, project: typeof task.project === 'string' ? projects.find((p) => p._id === task.project) || task.project : task.project }
      return { ...d, tasks: list.some((t) => t._id === task._id) ? list.map((t) => (t._id === task._id ? withProject : t)) : [withProject, ...list] }
    })
  useSocketEvent('taskCreated', (p) => upsert(p.task))
  useSocketEvent('taskUpdated', (p) => upsert(p.task))
  useSocketEvent('taskDeleted', (p) => mutate((d) => ({ ...d, tasks: (d?.tasks || []).filter((t) => t._id !== p.taskId) })))
  useSocketEvent('projectUpdated', () => reload())

  const grouped = useMemo(() => {
    const q = filters.q.trim().toLowerCase()
    const match = (t) => (!q || `${t.title} ${t.key || ''}`.toLowerCase().includes(q)) && (!filters.status || t.status === filters.status)
    return Object.fromEntries(projects.map((p) => [p._id, tasks.filter((t) => (t.project?._id || t.project) === p._id && match(t))]))
  }, [projects, tasks, filters])

  const ordered = [...projects].sort((a, b) => ORDER[a.status] - ORDER[b.status])
  const totals = { issues: tasks.length, points: sum(tasks), open: tasks.filter((t) => t.status !== 'done').length }

  const changeStatus = async (project, status) => {
    try {
      await updateProject(id, project._id, { status })
      toast.success(status === 'active' ? `${project.title} started` : status === 'completed' ? `${project.title} completed` : 'Project updated')
      reloadWorkspace()
    } catch (err) {
      toast.error(getErrorMessage(err))
    }
  }

  const remove = async (project) => {
    const ok = await confirm({
      title: `Delete “${project.title}”?`,
      message: `This permanently deletes the project together with its ${project.stats?.total || 0} issues and all of their comments. This cannot be undone.`,
      confirmLabel: 'Delete project',
      danger: true,
    })
    if (!ok) return
    try {
      await deleteProject(id, project._id)
      toast.success('Project deleted')
      reloadWorkspace()
      reload()
    } catch (err) {
      toast.error(getErrorMessage(err))
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 p-4 sm:p-8">
      <PageHeader
        icon={LayoutList}
        title="Backlog & Planning"
        subtitle={`${totals.open} open issues across ${projects.length} project${projects.length === 1 ? '' : 's'} · ${totals.points} story points planned`}
        actions={isStaff && <Button variant="primary" icon={Plus} onClick={() => setModal({})}>Create sprint</Button>}
      />

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-72">
          <Search size={14} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-faint" />
          <input className="input pl-9" placeholder="Search by title or key…" value={filters.q} onChange={(e) => setFilters({ ...filters, q: e.target.value })} />
        </div>
        {[['', 'All'], ...STATUSES.map((s) => [s.key, s.label])].map(([k, label]) => (
          <button key={k} onClick={() => setFilters({ ...filters, status: k })} className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${filters.status === k ? 'border-brand bg-brand/15 text-brand' : 'border-line bg-card text-muted hover:text-fg'}`}>{label}</button>
        ))}
      </div>

      {error ? (
        <ErrorState message={getErrorMessage(error)} onRetry={reload} />
      ) : loading ? (
        <div className="space-y-4">{[0, 1].map((i) => <Skeleton key={i} className="h-48" />)}</div>
      ) : ordered.length === 0 ? (
        <EmptyState icon={LayoutList} title="Nothing to plan yet" message={isStaff ? 'Create a sprint to start adding and estimating issues.' : 'Ask an admin to create the first sprint.'} action={isStaff && <Button variant="primary" icon={Plus} onClick={() => setModal({})}>Create sprint</Button>} />
      ) : (
        <div className="space-y-4">
          {ordered.map((p) => (
            <Section
              key={p._id}
              project={p}
              tasks={grouped[p._id] || []}
              isStaff={isStaff}
              isOwner={isOwner}
              defaultOpen={p.status !== 'completed'}
              filterActive={Boolean(filters.q || filters.status)}
              onAdd={(t) => { upsert(t); reloadWorkspace() }}
              onEdit={(project) => setModal({ project })}
              onStatus={changeStatus}
              onDelete={remove}
            />
          ))}
        </div>
      )}

      <ProjectFormModal open={Boolean(modal)} workspaceId={id} project={modal?.project} onClose={() => setModal(null)} onSaved={() => reloadWorkspace()} />
    </div>
  )
}
