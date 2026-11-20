import { useState } from 'react'
import toast from 'react-hot-toast'
import { Button, Field, Input, Modal, Select, Textarea } from './ui'
import { createProject, updateProject } from '../api/projectApi'
import { getErrorMessage } from '../lib/errors'
import { PROJECT_STATUSES } from '../lib/constants'
import { toInputDate } from '../lib/format'

function ProjectForm({ workspaceId, project, onClose, onSaved }) {
  const editing = Boolean(project)
  const [form, setForm] = useState({
    title: project?.title || '',
    description: project?.description || '',
    status: project?.status || 'planning',
    startDate: toInputDate(project?.startDate),
    endDate: toInputDate(project?.endDate),
    key: project?.key || '',
  })
  const [saving, setSaving] = useState(false)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    if (form.startDate && form.endDate && form.endDate < form.startDate) return toast.error('The end date must be after the start date')
    setSaving(true)
    try {
      const body = {
        title: form.title.trim(),
        description: form.description.trim(),
        status: form.status,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
      }
      if (!editing && form.key.trim()) body.key = form.key.trim().toUpperCase()
      const res = editing ? await updateProject(workspaceId, project._id, body) : await createProject(workspaceId, body)
      toast.success(editing ? 'Project updated' : 'Project created')
      onSaved?.(res.project)
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
      title={editing ? 'Edit sprint / project' : 'Create sprint / project'}
      description="A project groups issues into a time-boxed cycle."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" form="project-form" loading={saving} disabled={form.title.trim().length < 2}>
            {editing ? 'Save changes' : 'Create'}
          </Button>
        </>
      }
    >
      <form id="project-form" onSubmit={submit} className="grid grid-cols-2 gap-4">
        <Field label="Name" className="col-span-2">
          {(i) => <Input id={i} autoFocus value={form.title} onChange={set('title')} maxLength={100} placeholder="Sprint 24: Core Engine Optimization" required />}
        </Field>
        <Field label="Goal" className="col-span-2">
          {(i) => <Textarea id={i} rows={3} value={form.description} onChange={set('description')} maxLength={1000} placeholder="What should be true when this cycle ends?" />}
        </Field>
        <Field label="Status">
          {(i) => <Select id={i} value={form.status} onChange={set('status')}>{PROJECT_STATUSES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}</Select>}
        </Field>
        <Field label="Issue key" hint={editing ? 'Fixed after creation' : 'Optional, e.g. COR → COR-12'}>
          {(i) => <Input id={i} className="font-mono uppercase" value={form.key} onChange={set('key')} maxLength={5} disabled={editing} placeholder="auto" pattern="[A-Za-z][A-Za-z0-9]{1,4}|" />}
        </Field>
        <Field label="Start date">{(i) => <Input id={i} type="date" value={form.startDate} onChange={set('startDate')} />}</Field>
        <Field label="End date">{(i) => <Input id={i} type="date" value={form.endDate} onChange={set('endDate')} />}</Field>
      </form>
    </Modal>
  )
}

export default function ProjectFormModal({ open, ...props }) {
  return open ? <ProjectForm {...props} /> : null
}
