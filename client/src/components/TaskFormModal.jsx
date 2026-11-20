import { useState } from 'react'
import toast from 'react-hot-toast'
import { Button, Field, Input, Modal, Select, Textarea } from './ui'
import { useAuth, useWorkspace } from '../hooks'
import { createTask } from '../api/projectApi'
import { getErrorMessage } from '../lib/errors'
import { POINT_OPTIONS, PRIORITIES, STATUSES } from '../lib/constants'

function TaskForm({ onClose, defaults = {}, onCreated }) {
  const { id, projects, members } = useWorkspace()
  const { user } = useAuth()

  const usable = projects.filter((p) => p.status !== 'completed')
  const pool = usable.length ? usable : projects
  const initialProject = defaults.projectId || pool.find((p) => p.status === 'active')?._id || pool[0]?._id || ''

  const [form, setForm] = useState({
    projectId: initialProject,
    title: '',
    description: '',
    status: defaults.status || 'todo',
    priority: 'medium',
    assignedTo: user?._id || '',
    points: 1,
    dueDate: '',
    labels: '',
  })
  const [saving, setSaving] = useState(false)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    if (!form.projectId) return toast.error('Create a project first')
    setSaving(true)
    try {
      const { task } = await createTask(id, form.projectId, {
        title: form.title.trim(),
        description: form.description.trim(),
        status: form.status,
        priority: form.priority,
        assignedTo: form.assignedTo || null,
        points: Number(form.points),
        dueDate: form.dueDate || null,
        labels: form.labels.split(',').map((l) => l.trim().replace(/^#/, '')).filter(Boolean).slice(0, 10),
      })
      toast.success(`${task.key || 'Issue'} created`)
      onCreated?.(task)
      onClose()
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="New issue"
      description="Capture work and assign it to the team."
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" form="task-form" loading={saving} disabled={!form.title.trim() || !form.projectId}>
            Create issue
          </Button>
        </>
      }
    >
      {pool.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">This workspace has no projects yet. Create one from “Backlog &amp; Planning” first.</p>
      ) : (
        <form id="task-form" onSubmit={submit} className="grid grid-cols-2 gap-4">
          <Field label="Title" className="col-span-2">
            {(i) => <Input id={i} autoFocus value={form.title} onChange={set('title')} maxLength={200} placeholder="e.g. Migrate session store to DragonflyDB" required />}
          </Field>
          <Field label="Description" className="col-span-2">
            {(i) => <Textarea id={i} rows={4} value={form.description} onChange={set('description')} placeholder="Context, acceptance criteria, links…" />}
          </Field>
          <Field label="Project" className="col-span-2 sm:col-span-1">
            {(i) => (
              <Select id={i} value={form.projectId} onChange={set('projectId')}>
                {pool.map((p) => <option key={p._id} value={p._id}>{p.title}</option>)}
              </Select>
            )}
          </Field>
          <Field label="Assignee" className="col-span-2 sm:col-span-1">
            {(i) => (
              <Select id={i} value={form.assignedTo} onChange={set('assignedTo')}>
                <option value="">Unassigned</option>
                {members.map((m) => <option key={m._id} value={m._id}>{m.name}</option>)}
              </Select>
            )}
          </Field>
          <Field label="Status">
            {(i) => <Select id={i} value={form.status} onChange={set('status')}>{STATUSES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}</Select>}
          </Field>
          <Field label="Priority">
            {(i) => <Select id={i} value={form.priority} onChange={set('priority')}>{PRIORITIES.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}</Select>}
          </Field>
          <Field label="Story points">
            {(i) => <Select id={i} value={form.points} onChange={set('points')}>{POINT_OPTIONS.map((p) => <option key={p} value={p}>{p} pt</option>)}</Select>}
          </Field>
          <Field label="Due date">
            {(i) => <Input id={i} type="date" value={form.dueDate} onChange={set('dueDate')} />}
          </Field>
          <Field label="Labels" hint="Comma separated, e.g. infra, security" className="col-span-2">
            {(i) => <Input id={i} value={form.labels} onChange={set('labels')} placeholder="infra, security" />}
          </Field>
        </form>
      )}
    </Modal>
  )
}

/** Mounted only while open, so the form state resets on every use */
export default function TaskFormModal({ open, ...props }) {
  return open ? <TaskForm {...props} /> : null
}
