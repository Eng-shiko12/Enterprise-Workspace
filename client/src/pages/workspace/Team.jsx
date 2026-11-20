import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Activity, LogOut, Mail, Settings, Shield, Trash2, UserMinus, UserPlus, Users } from 'lucide-react'
import toast from 'react-hot-toast'
import PageHeader from '../../components/PageHeader'
import { Avatar, Badge, Button, EmptyState, Field, IconButton, Input, Modal, Select, Spinner, Tabs, Textarea } from '../../components/ui'
import { useApi, useAuth, useConfirm, useSocketEvent, useWorkspace } from '../../hooks'
import { deleteWorkspace, getActivityLogs, inviteMember, leaveWorkspace, removeMember, updateMemberRole, updateWorkspace } from '../../api/workspaceApi'
import { getErrorMessage } from '../../lib/errors'
import { ACTIVITY_LABELS, ROLE_STYLES } from '../../lib/constants'
import { formatDate, timeAgo } from '../../lib/format'

function InviteModal({ onClose, workspaceId, isOwner, onDone }) {
  const [form, setForm] = useState({ email: '', role: 'member' })
  const [busy, setBusy] = useState(false)
  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      await inviteMember(workspaceId, { email: form.email.trim(), role: form.role })
      toast.success('Invitation sent')
      onDone()
      onClose()
    } catch (err) {
      toast.error(getErrorMessage(err))
      setBusy(false)
    }
  }
  return (
    <Modal open onClose={onClose} title="Invite a teammate" description="They need an existing Vortex account." footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" type="submit" form="invite-form" loading={busy} disabled={!form.email.trim()}>Send invitation</Button></>}>
      <form id="invite-form" onSubmit={submit} className="space-y-4">
        <Field label="Email">{(i) => <Input id={i} type="email" autoFocus required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="teammate@company.com" />}</Field>
        <Field label="Role" hint={isOwner ? 'Admins can manage projects, boards and members.' : 'Only the owner can invite admins.'}>
          {(i) => <Select id={i} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}><option value="member">Member</option>{isOwner && <option value="admin">Admin</option>}</Select>}
        </Field>
      </form>
    </Modal>
  )
}

function Members() {
  const { id, members, pending, isStaff, isOwner, myRole, reload } = useWorkspace()
  const { user } = useAuth()
  const confirm = useConfirm()
  const navigate = useNavigate()
  const [inviting, setInviting] = useState(false)

  const changeRole = async (m, role) => {
    try { await updateMemberRole(id, m._id, role); toast.success(`${m.name} is now ${role}`); reload() } catch (err) { toast.error(getErrorMessage(err)) }
  }
  const remove = async (m) => {
    if (!(await confirm({ title: `Remove ${m.name}?`, message: 'They lose access immediately and their open issues become unassigned.', confirmLabel: 'Remove', danger: true }))) return
    try { await removeMember(id, m._id); toast.success('Member removed'); reload() } catch (err) { toast.error(getErrorMessage(err)) }
  }
  const leave = async () => {
    if (!(await confirm({ title: 'Leave this workspace?', message: 'You will need a new invitation to rejoin.', confirmLabel: 'Leave', danger: true }))) return
    try { await leaveWorkspace(id); toast.success('You left the workspace'); navigate('/workspaces') } catch (err) { toast.error(getErrorMessage(err)) }
  }
  const canRemove = (m) => isStaff && m.role !== 'owner' && m._id !== user._id && (m.role !== 'admin' || isOwner)

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-muted">{members.length} active member{members.length === 1 ? '' : 's'}</p>
        <div className="flex gap-2">
          {myRole !== 'owner' && <Button icon={LogOut} onClick={leave}>Leave workspace</Button>}
          {isStaff && <Button variant="primary" icon={UserPlus} onClick={() => setInviting(true)}>Invite member</Button>}
        </div>
      </div>

      <div className="card divide-y divide-line">
        {members.map((m) => (
          <div key={m._id} className="flex flex-wrap items-center gap-3 px-4 py-3">
            <Avatar user={m} size={36} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium text-fg">{m.name}{m._id === user._id && <span className="ml-2 text-xs text-faint">(you)</span>}</p>
              <p className="truncate text-xs text-muted">{m.email}</p>
            </div>
            <span className="hidden text-xs text-faint sm:block">Joined {formatDate(m.joinedAt, { month: 'short', year: 'numeric' })}</span>
            {isOwner && m.role !== 'owner' ? (
              <div className="w-28"><Select value={m.role} onChange={(e) => changeRole(m, e.target.value)} className="py-1 text-xs" aria-label={`Role of ${m.name}`}><option value="member">Member</option><option value="admin">Admin</option></Select></div>
            ) : <Badge className={`${ROLE_STYLES[m.role]} capitalize`}>{m.role}</Badge>}
            <div className="w-8">{canRemove(m) && <IconButton label={`Remove ${m.name}`} onClick={() => remove(m)} className="hover:text-danger"><UserMinus size={15} /></IconButton>}</div>
          </div>
        ))}
      </div>

      {isStaff && pending.length > 0 && (
        <div>
          <h3 className="label mb-2">Pending invitations</h3>
          <div className="card divide-y divide-line">
            {pending.map((m) => (
              <div key={m.user._id} className="flex items-center gap-3 px-4 py-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-raised text-muted"><Mail size={15} /></span>
                <div className="min-w-0 flex-1"><p className="truncate text-[13px] text-fg">{m.user.name}</p><p className="truncate text-xs text-muted">{m.user.email}</p></div>
                <Badge className="bg-warn/15 text-warn">Pending · {m.role}</Badge>
                <IconButton label="Revoke invitation" onClick={() => remove(m.user)} className="hover:text-danger"><UserMinus size={15} /></IconButton>
              </div>
            ))}
          </div>
        </div>
      )}
      {inviting && <InviteModal workspaceId={id} isOwner={isOwner} onClose={() => setInviting(false)} onDone={reload} />}
    </div>
  )
}

function ActivityFeed() {
  const { id } = useWorkspace()
  const [page, setPage] = useState(1)
  const [action, setAction] = useState('')
  const { data, loading, reload } = useApi(() => getActivityLogs(id, { page, limit: 15, ...(action && { action }) }), [id, page, action])
  useSocketEvent('taskCreated', reload)
  useSocketEvent('taskUpdated', reload)

  const logs = data?.logs || []
  return (
    <div className="space-y-4">
      <div className="w-56"><Select value={action} onChange={(e) => { setAction(e.target.value); setPage(1) }} aria-label="Filter activity">
        <option value="">All activity</option>
        {Object.keys(ACTIVITY_LABELS).map((k) => <option key={k} value={k}>{k.replaceAll('_', ' ').toLowerCase()}</option>)}
      </Select></div>
      {loading && !data ? <div className="flex justify-center py-12"><Spinner size={20} /></div> : logs.length === 0 ? (
        <EmptyState icon={Activity} title="No activity yet" message="Actions taken in this workspace will show up here." />
      ) : (
        <div className="card divide-y divide-line">
          {logs.map((l) => (
            <div key={l._id} className="flex items-center gap-3 px-4 py-3">
              <Avatar user={l.actor} size={28} />
              <p className="min-w-0 flex-1 text-[13px] text-muted">
                <b className="text-fg">{l.actor?.name || 'Someone'}</b> {ACTIVITY_LABELS[l.actionType] || l.actionType.toLowerCase()}{' '}
                <span className="font-mono text-xs text-accent">{l.details?.key}</span> <span className="text-fg">{l.details?.title || l.details?.email || ''}</span>
                {l.details?.to && <> → <span className="text-fg">{l.details.to}</span></>}
              </p>
              <span className="shrink-0 text-xs text-faint">{timeAgo(l.createdAt)}</span>
            </div>
          ))}
        </div>
      )}
      {data?.totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-muted">
          <span>Page {data.currentPage} of {data.totalPages}</span>
          <div className="flex gap-2"><Button size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button><Button size="sm" disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button></div>
        </div>
      )}
    </div>
  )
}

function WorkspaceSettings() {
  const { id, workspace, isOwner, reload } = useWorkspace()
  const confirm = useConfirm()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: workspace.name, description: workspace.description || '' })
  const [busy, setBusy] = useState(false)
  const [typed, setTyped] = useState('')

  const save = async (e) => {
    e.preventDefault()
    setBusy(true)
    try { await updateWorkspace(id, { name: form.name.trim(), description: form.description.trim() }); toast.success('Workspace updated'); reload() } catch (err) { toast.error(getErrorMessage(err)) } finally { setBusy(false) }
  }
  const destroy = async () => {
    if (!(await confirm({ title: 'Delete workspace permanently?', message: 'All projects, issues, boards, comments and activity will be erased for every member. This cannot be undone.', confirmLabel: 'Delete workspace', danger: true }))) return
    try { await deleteWorkspace(id); toast.success('Workspace deleted'); navigate('/workspaces') } catch (err) { toast.error(getErrorMessage(err)) }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <form onSubmit={save} className="card space-y-4 p-5">
        <Field label="Workspace name">{(i) => <Input id={i} value={form.name} maxLength={80} required onChange={(e) => setForm({ ...form, name: e.target.value })} />}</Field>
        <Field label="Description">{(i) => <Textarea id={i} rows={3} maxLength={500} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />}</Field>
        <div className="flex justify-end"><Button variant="primary" type="submit" loading={busy} disabled={form.name.trim().length < 2}>Save changes</Button></div>
      </form>
      {isOwner && (
        <div className="card border-danger/30 p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-danger"><Shield size={15} /> Danger zone</h3>
          <p className="mt-1.5 text-xs leading-relaxed text-muted">Deleting this workspace removes everything inside it for all members. Type <b className="text-fg">{workspace.name}</b> to confirm.</p>
          <div className="mt-3 flex gap-2"><Input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={workspace.name} /><Button variant="danger" icon={Trash2} disabled={typed !== workspace.name} onClick={destroy}>Delete</Button></div>
        </div>
      )}
    </div>
  )
}

export default function Team() {
  const { workspace, members, isStaff } = useWorkspace()
  const [tab, setTab] = useState('members')
  const tabs = [
    { key: 'members', label: 'Members', icon: Users, count: members.length },
    ...(isStaff ? [{ key: 'activity', label: 'Activity', icon: Activity }, { key: 'settings', label: 'Settings', icon: Settings }] : []),
  ]
  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 p-4 sm:p-8">
      <PageHeader icon={Users} title="Team & Access" subtitle={workspace.description || `People and permissions in ${workspace.name}.`} />
      <Tabs tabs={tabs} value={tab} onChange={setTab} />
      {tab === 'members' && <Members />}
      {tab === 'activity' && isStaff && <ActivityFeed />}
      {tab === 'settings' && isStaff && <WorkspaceSettings />}
    </div>
  )
}
