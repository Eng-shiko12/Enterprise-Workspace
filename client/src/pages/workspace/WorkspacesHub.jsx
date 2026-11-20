import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Building2, Check, Mail, Plus, Users, X } from 'lucide-react'
import toast from 'react-hot-toast'
import PageHeader from '../../components/PageHeader'
import { Badge, Button, EmptyState, ErrorState, Field, Input, Modal, Skeleton, Textarea } from '../../components/ui'
import { useApi, useSocketEvent } from '../../hooks'
import { createWorkspace, getMyWorkspaces, respondToInvite } from '../../api/workspaceApi'
import { getErrorMessage } from '../../lib/errors'
import { ROLE_STYLES } from '../../lib/constants'
import { timeAgo } from '../../lib/format'

function CreateWorkspaceModal({ onClose }) {
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', description: '' })
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      const { workspace } = await createWorkspace({ name: form.name.trim(), description: form.description.trim() })
      toast.success('Workspace created')
      navigate(`/workspaces/${workspace._id}/backlog`)
    } catch (err) {
      toast.error(getErrorMessage(err))
      setBusy(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Create workspace"
      description="A workspace holds your projects, boards and teammates."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" form="ws-form" loading={busy} disabled={form.name.trim().length < 2}>Create workspace</Button>
        </>
      }
    >
      <form id="ws-form" onSubmit={submit} className="space-y-4">
        <Field label="Name">{(i) => <Input id={i} autoFocus maxLength={80} required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Acme Engineering" />}</Field>
        <Field label="Description (optional)">{(i) => <Textarea id={i} rows={3} maxLength={500} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What does this team build?" />}</Field>
      </form>
    </Modal>
  )
}

export default function WorkspacesHub() {
  const { data, loading, error, reload } = useApi(getMyWorkspaces, [])
  const [creating, setCreating] = useState(false)
  const [busyInvite, setBusyInvite] = useState(null)

  // A teammate invited us (or changed something) while this page is open
  useSocketEvent('notification', () => reload())

  const spaces = data?.allSpace || []
  const invites = data?.pendingInvites || []

  const respond = async (ws, response) => {
    setBusyInvite(ws._id)
    try {
      await respondToInvite(ws._id, response)
      toast.success(response === 'accept' ? `Joined ${ws.name}` : 'Invitation declined')
      reload()
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setBusyInvite(null)
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 p-4 sm:p-8">
      <PageHeader
        icon={Building2}
        title="Your workspaces"
        subtitle="Jump into a team’s sprint, or create a new space for your next project."
        actions={<Button variant="primary" icon={Plus} onClick={() => setCreating(true)}>New workspace</Button>}
      />

      {invites.length > 0 && (
        <section className="space-y-3">
          <h2 className="label">Pending invitations</h2>
          {invites.map((w) => (
            <div key={w._id} className="card flex flex-wrap items-center gap-4 border-brand/40 bg-brand/5 p-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/15 text-brand"><Mail size={18} /></span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-fg">{w.name}</p>
                <p className="text-xs text-muted">
                  {w.owner?.name ? `${w.owner.name} invited you` : 'You were invited'} as <b className="capitalize">{w.invitedRole}</b>
                </p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" loading={busyInvite === w._id} onClick={() => respond(w, 'decline')} icon={X}>Decline</Button>
                <Button size="sm" variant="primary" loading={busyInvite === w._id} onClick={() => respond(w, 'accept')} icon={Check}>Accept</Button>
              </div>
            </div>
          ))}
        </section>
      )}

      {error ? (
        <ErrorState message={getErrorMessage(error)} onRetry={reload} />
      ) : loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-40" />)}</div>
      ) : spaces.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No workspaces yet"
          message="Create your first workspace to start planning sprints, or accept an invitation from a teammate."
          action={<Button variant="primary" icon={Plus} onClick={() => setCreating(true)}>Create workspace</Button>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {spaces.map((w) => (
            <Link key={w._id} to={`/workspaces/${w._id}/sprint`} className="card group flex flex-col p-5 transition hover:-translate-y-0.5 hover:border-line-strong hover:shadow-[var(--shadow)]">
              <div className="flex items-start justify-between">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand/15 text-lg font-bold text-brand">{w.name[0]?.toUpperCase()}</span>
                <Badge className={ROLE_STYLES[w.myRole]}>{w.myRole}</Badge>
              </div>
              <h3 className="mt-4 truncate text-[15px] font-semibold text-fg">{w.name}</h3>
              <p className="mt-1 line-clamp-2 min-h-[2.5rem] text-xs leading-relaxed text-muted">{w.description || 'No description yet.'}</p>
              <div className="mt-4 flex items-center justify-between border-t border-line pt-3 text-xs text-faint">
                <span className="flex items-center gap-1.5"><Users size={13} /> {w.memberCount} member{w.memberCount === 1 ? '' : 's'}</span>
                <span className="flex items-center gap-1 text-muted transition group-hover:text-brand">
                  Open <ArrowRight size={13} />
                </span>
              </div>
              <span className="mt-1 text-[11px] text-faint">Updated {timeAgo(w.updatedAt)}</span>
            </Link>
          ))}
        </div>
      )}

      {creating && <CreateWorkspaceModal onClose={() => setCreating(false)} />}
    </div>
  )
}
