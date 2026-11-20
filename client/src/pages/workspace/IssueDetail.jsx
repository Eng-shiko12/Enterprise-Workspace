import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Calendar, Check, Copy, Layers, Pencil, Send, Tag, Trash2, User, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { Avatar, Badge, Button, ErrorState, PageLoader, PriorityIcon, Select, Textarea } from '../../components/ui'
import { useApi, useAuth, useConfirm, useSocketEvent, useWorkspace } from '../../hooks'
import { addComment, deleteComment, deleteTask, getComments, getTask, updateComment, updateTask } from '../../api/projectApi'
import { getErrorMessage } from '../../lib/errors'
import { POINT_OPTIONS, PRIORITIES, PRIORITY_MAP, STATUSES } from '../../lib/constants'
import { dueInfo, formatDate, taskKey, timeAgo, toInputDate } from '../../lib/format'

function Prop({ icon: Icon, label, children }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="flex items-center gap-2 text-[13px] text-muted"><Icon size={14} className="text-faint" />{label}</span>
      <div className="min-w-0 max-w-[60%] text-right text-[13px] text-fg">{children}</div>
    </div>
  )
}

function Comment({ comment, canEdit, canDelete, onSave, onDelete }) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(comment.content)

  const save = async () => {
    if (!text.trim() || text === comment.content) return setEditing(false)
    await onSave(comment, text.trim())
    setEditing(false)
  }

  return (
    <div className="flex gap-3">
      <Avatar user={comment.user} size={32} />
      <div className="min-w-0 flex-1 rounded-xl border border-line bg-card p-3.5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[13px]"><b className="text-fg">{comment.user?.name || 'Deleted user'}</b> <span className="ml-1.5 text-xs text-faint">{timeAgo(comment.createdAt)}{comment.isEdited && ' · edited'}</span></p>
          <div className="flex gap-1">
            {canEdit && !editing && <button onClick={() => setEditing(true)} className="rounded p-1 text-faint hover:bg-raised hover:text-fg" aria-label="Edit comment"><Pencil size={13} /></button>}
            {canDelete && <button onClick={() => onDelete(comment)} className="rounded p-1 text-faint hover:bg-raised hover:text-danger" aria-label="Delete comment"><Trash2 size={13} /></button>}
          </div>
        </div>
        {editing ? (
          <div className="mt-2 space-y-2">
            <Textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} autoFocus />
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setText(comment.content) }}>Cancel</Button>
              <Button size="sm" variant="primary" onClick={save}>Save</Button>
            </div>
          </div>
        ) : (
          <p className="mt-1.5 text-[13px] leading-relaxed whitespace-pre-wrap text-muted">{comment.content}</p>
        )}
      </div>
    </div>
  )
}

export default function IssueDetail() {
  const { workSpaceId, projectId, taskId } = useParams()
  const { members, isStaff } = useWorkspace()
  const { user } = useAuth()
  const confirm = useConfirm()
  const navigate = useNavigate()

  const task$ = useApi(() => getTask(workSpaceId, projectId, taskId), [workSpaceId, projectId, taskId])
  const comments$ = useApi(() => getComments(workSpaceId, projectId, taskId), [workSpaceId, projectId, taskId])
  const task = task$.data?.task
  const comments = comments$.data?.comments || []

  // null = "not edited", so the inputs always mirror the (realtime-updated) task until the user types
  const [titleDraft, setTitleDraft] = useState(null)
  const [editingTitle, setEditingTitle] = useState(false)
  const [descDraft, setDescDraft] = useState(null)
  const [editingDesc, setEditingDesc] = useState(false)
  const [labelsDraft, setLabelsDraft] = useState(null)
  const [draft, setDraft] = useState('')
  const [posting, setPosting] = useState(false)

  const patchTask = (updater) => task$.mutate((d) => ({ ...d, task: { ...d.task, ...updater } }))

  useSocketEvent('taskUpdated', (p) => p.task._id === taskId && patchTask({ ...p.task, project: task?.project }))
  useSocketEvent('taskDeleted', (p) => {
    if (p.taskId === taskId) { toast('This issue was deleted'); navigate(`/workspaces/${workSpaceId}/sprint`) }
  })
  useSocketEvent('commentAdded', (p) => p.taskId === taskId && comments$.reload())
  useSocketEvent('commentUpdated', (p) => p.taskId === taskId && comments$.reload())
  useSocketEvent('commentDeleted', (p) => p.taskId === taskId && comments$.reload())

  const save = async (body, optimistic) => {
    const before = task
    if (optimistic) patchTask(optimistic)
    try {
      const res = await updateTask(workSpaceId, projectId, taskId, body)
      patchTask({ ...res.task, project: task.project })
    } catch (err) {
      patchTask(before)
      toast.error(getErrorMessage(err))
    }
  }

  const saveTitle = async () => {
    const next = (titleDraft ?? task.title).trim()
    setEditingTitle(false)
    setTitleDraft(null)
    if (next && next !== task.title) await save({ title: next }, { title: next })
  }
  const saveDesc = async () => {
    const next = (descDraft ?? task.description ?? '').trim()
    setEditingDesc(false)
    setDescDraft(null)
    if (next !== (task.description || '')) await save({ description: next }, { description: next })
  }
  const saveLabels = () => {
    const next = (labelsDraft ?? '').split(',').map((l) => l.trim().replace(/^#/, '')).filter(Boolean).slice(0, 10)
    const changed = labelsDraft !== null && next.join() !== (task.labels || []).join()
    setLabelsDraft(null)
    if (changed) save({ labels: next }, { labels: next })
  }

  const postComment = async () => {
    if (!draft.trim()) return
    setPosting(true)
    try {
      await addComment(workSpaceId, projectId, taskId, draft.trim())
      setDraft('')
      comments$.reload()
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setPosting(false)
    }
  }

  const editComment = async (comment, content) => {
    try { await updateComment(workSpaceId, comment._id, content); comments$.reload() } catch (err) { toast.error(getErrorMessage(err)) }
  }
  const removeComment = async (comment) => {
    if (!(await confirm({ title: 'Delete comment?', message: 'This cannot be undone.', confirmLabel: 'Delete', danger: true }))) return
    try { await deleteComment(workSpaceId, comment._id); comments$.reload() } catch (err) { toast.error(getErrorMessage(err)) }
  }

  const removeTask = async () => {
    if (!(await confirm({ title: `Delete ${taskKey(task)}?`, message: 'The issue and all its comments will be permanently removed.', confirmLabel: 'Delete issue', danger: true }))) return
    try {
      await deleteTask(workSpaceId, projectId, taskId)
      toast.success('Issue deleted')
      navigate(`/workspaces/${workSpaceId}/sprint?project=${projectId}`)
    } catch (err) { toast.error(getErrorMessage(err)) }
  }

  if (task$.loading) return <PageLoader label="Loading issue…" />
  if (task$.error || !task) return <div className="mx-auto max-w-lg p-10"><ErrorState message={getErrorMessage(task$.error, 'Issue not found')} onRetry={task$.reload} /></div>

  const project = task.project
  const due = dueInfo(task.dueDate, task.status === 'done')
  const backTo = `/workspaces/${workSpaceId}/sprint?project=${projectId}`

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-6 p-4 sm:p-8 lg:grid-cols-[1fr_320px]">
      <div className="min-w-0 space-y-6">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
          <Link to={backTo} className="flex items-center gap-1.5 hover:text-fg"><ArrowLeft size={14} /> {project?.title || 'Sprint'}</Link>
          <span className="text-faint">/</span>
          <span className="font-mono text-fg">{taskKey(task)}</span>
          <Badge className={PRIORITY_MAP[task.priority]?.pill}><PriorityIcon priority={task.priority} size={11} />{PRIORITY_MAP[task.priority]?.label}</Badge>
          <button onClick={() => { navigator.clipboard?.writeText(window.location.href); toast.success('Link copied') }} className="ml-auto flex items-center gap-1.5 hover:text-fg"><Copy size={13} /> Copy link</button>
        </div>

        {editingTitle ? (
          <input autoFocus value={titleDraft ?? task.title} maxLength={200} onChange={(e) => setTitleDraft(e.target.value)} onBlur={saveTitle} onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') { setTitleDraft(null); setEditingTitle(false) } }} className="input w-full text-2xl font-semibold" />
        ) : (
          <h1 onClick={() => setEditingTitle(true)} title="Click to edit" className="cursor-text text-2xl leading-snug font-semibold tracking-tight text-fg hover:text-brand sm:text-[28px]">{task.title}</h1>
        )}

        <section className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="label">Description</h2>
            {!editingDesc && <button onClick={() => setEditingDesc(true)} className="flex items-center gap-1.5 text-xs text-muted hover:text-fg"><Pencil size={12} /> Edit</button>}
          </div>
          {editingDesc ? (
            <div className="space-y-3">
              <Textarea rows={8} autoFocus value={descDraft ?? task.description ?? ''} onChange={(e) => setDescDraft(e.target.value)} maxLength={10000} className="font-mono text-[13px]" />
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="ghost" icon={X} onClick={() => { setDescDraft(null); setEditingDesc(false) }}>Cancel</Button>
                <Button size="sm" variant="primary" icon={Check} onClick={saveDesc}>Save</Button>
              </div>
            </div>
          ) : task.description ? (
            <p className="text-[13px] leading-relaxed whitespace-pre-wrap text-muted">{task.description}</p>
          ) : (
            <button onClick={() => setEditingDesc(true)} className="text-[13px] text-faint hover:text-muted">Add a description…</button>
          )}
        </section>

        <section className="space-y-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-fg">Comments <span className="rounded bg-raised px-1.5 py-0.5 font-mono text-[10px] text-muted">{comments.length}</span></h2>
          <div className="flex gap-3">
            <Avatar user={user} size={32} />
            <div className="flex-1 space-y-2">
              <Textarea rows={3} value={draft} maxLength={5000} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') postComment() }} placeholder="Leave a comment…" />
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-faint"><span className="kbd">⌘</span> + <span className="kbd">Enter</span> to submit</span>
                <Button variant="primary" size="sm" icon={Send} loading={posting} disabled={!draft.trim()} onClick={postComment}>Comment</Button>
              </div>
            </div>
          </div>
          {comments.map((c) => (
            <Comment key={c._id} comment={c} canEdit={c.user?._id === user._id} canDelete={c.user?._id === user._id || isStaff} onSave={editComment} onDelete={removeComment} />
          ))}
          {!comments$.loading && comments.length === 0 && <p className="py-4 text-center text-xs text-faint">No comments yet — start the conversation.</p>}
        </section>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
        <div className="card divide-y divide-line px-4 py-2">
          <Prop icon={Layers} label="Status">
            <Select value={task.status} onChange={(e) => save({ status: e.target.value }, { status: e.target.value })} className="py-1 text-xs">{STATUSES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}</Select>
          </Prop>
          <Prop icon={Layers} label="Priority">
            <Select value={task.priority} onChange={(e) => save({ priority: e.target.value }, { priority: e.target.value })} className="py-1 text-xs">{PRIORITIES.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}</Select>
          </Prop>
          <Prop icon={User} label="Assignee">
            <Select value={task.assignedTo?._id || ''} onChange={(e) => { const m = members.find((x) => x._id === e.target.value); save({ assignedTo: e.target.value || null }, { assignedTo: m || undefined }) }} className="py-1 text-xs">
              <option value="">Unassigned</option>
              {members.map((m) => <option key={m._id} value={m._id}>{m.name}</option>)}
            </Select>
          </Prop>
          <Prop icon={User} label="Reporter"><span className="flex items-center justify-end gap-2">{task.createdBy && <Avatar user={task.createdBy} size={20} />}{task.createdBy?.name || '—'}</span></Prop>
          <Prop icon={Layers} label="Project"><Link to={backTo} className="text-brand hover:underline">{project?.title || '—'}</Link></Prop>
          <Prop icon={Layers} label="Estimate">
            <Select value={task.points} onChange={(e) => save({ points: Number(e.target.value) }, { points: Number(e.target.value) })} className="py-1 text-xs">{POINT_OPTIONS.map((p) => <option key={p} value={p}>{p} pts</option>)}</Select>
          </Prop>
          <Prop icon={Calendar} label="Due date">
            <input type="date" value={toInputDate(task.dueDate)} onChange={(e) => save({ dueDate: e.target.value || null }, { dueDate: e.target.value || undefined })} className="input py-1 text-xs" />
            {due && <span className={`mt-1 block font-mono text-[10px] ${due.tone}`}>{due.label}</span>}
          </Prop>
        </div>

        <div className="card p-4">
          <h3 className="label mb-2 flex items-center gap-1.5"><Tag size={12} /> Labels</h3>
          <input className="input" value={labelsDraft ?? (task.labels || []).join(', ')} onChange={(e) => setLabelsDraft(e.target.value)} onBlur={saveLabels} onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()} placeholder="infra, security" />
          <div className="mt-2 flex flex-wrap gap-1.5">{(task.labels || []).map((l) => <span key={l} className="rounded bg-brand/10 px-2 py-0.5 font-mono text-[11px] text-brand">#{l}</span>)}</div>
        </div>

        <p className="px-1 text-[11px] leading-relaxed text-faint">Created {formatDate(task.createdAt, { month: 'short', day: 'numeric', year: 'numeric' })} · Updated {timeAgo(task.updatedAt)}{task.completedAt && ` · Completed ${formatDate(task.completedAt)}`}</p>
        {isStaff && <Button variant="danger" icon={Trash2} className="w-full" onClick={removeTask}>Delete issue</Button>}
      </aside>
    </div>
  )
}
