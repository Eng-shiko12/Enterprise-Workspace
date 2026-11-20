import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Building2, CheckCircle2, CircleDot, KeyRound, ListChecks, Save, ShieldAlert, UserRound } from 'lucide-react'
import toast from 'react-hot-toast'
import { Avatar, Badge, Button, EmptyState, Field, Input, PriorityIcon, Skeleton, StatCard, StatusPill, Tabs } from '../../components/ui'
import { useApi, useAuth, useConfirm } from '../../hooks'
import { changePassword, deactivateAccount, getMyTasks, updateProfile } from '../../api/userApi'
import { getMyWorkspaces } from '../../api/workspaceApi'
import { getErrorMessage } from '../../lib/errors'
import { ROLE_STYLES } from '../../lib/constants'
import { dueInfo, formatDate, taskKey } from '../../lib/format'

function Details() {
  const { user, setUser } = useAuth()
  const [form, setForm] = useState({ name: user.name, avatar: user.avatar?.startsWith('http') ? user.avatar : '' })
  const [busy, setBusy] = useState(false)

  const save = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      const res = await updateProfile({ name: form.name.trim(), avatar: form.avatar.trim() })
      setUser(res.user)
      toast.success('Profile updated')
    } catch (err) { toast.error(getErrorMessage(err)) } finally { setBusy(false) }
  }

  return (
    <form onSubmit={save} className="card max-w-xl space-y-4 p-5">
      <Field label="Full name">{(i) => <Input id={i} value={form.name} minLength={2} maxLength={60} required onChange={(e) => setForm({ ...form, name: e.target.value })} />}</Field>
      <Field label="Email" hint="Your email is used to sign in and cannot be changed here.">{(i) => <Input id={i} value={user.email} disabled readOnly />}</Field>
      <Field label="Avatar URL" hint="Paste a link to an image (https://…). Leave empty to use initials.">{(i) => <Input id={i} type="url" value={form.avatar} onChange={(e) => setForm({ ...form, avatar: e.target.value })} placeholder="https://…" />}</Field>
      <div className="flex justify-end"><Button variant="primary" type="submit" icon={Save} loading={busy}>Save changes</Button></div>
    </form>
  )
}

function Security() {
  const { logout } = useAuth()
  const confirm = useConfirm()
  const navigate = useNavigate()
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' })
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (form.newPassword !== form.confirm) return toast.error('New passwords do not match')
    setBusy(true)
    try {
      await changePassword({ currentPassword: form.currentPassword, newPassword: form.newPassword })
      toast.success('Password changed')
      setForm({ currentPassword: '', newPassword: '', confirm: '' })
    } catch (err) { toast.error(getErrorMessage(err)) } finally { setBusy(false) }
  }

  const deactivate = async () => {
    if (!(await confirm({ title: 'Deactivate your account?', message: 'You will be signed out and will no longer be able to log in. Contact support to restore it.', confirmLabel: 'Deactivate', danger: true }))) return
    try { await deactivateAccount(); await logout().catch(() => {}); toast.success('Account deactivated'); navigate('/login') } catch (err) { toast.error(getErrorMessage(err)) }
  }

  return (
    <div className="max-w-xl space-y-6">
      <form onSubmit={submit} className="card space-y-4 p-5">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-fg"><KeyRound size={15} className="text-accent" /> Change password</h3>
        <Field label="Current password">{(i) => <Input id={i} type="password" autoComplete="current-password" required value={form.currentPassword} onChange={(e) => setForm({ ...form, currentPassword: e.target.value })} />}</Field>
        <Field label="New password" hint="At least 8 characters.">{(i) => <Input id={i} type="password" autoComplete="new-password" required minLength={8} value={form.newPassword} onChange={(e) => setForm({ ...form, newPassword: e.target.value })} />}</Field>
        <Field label="Confirm new password">{(i) => <Input id={i} type="password" autoComplete="new-password" required value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} />}</Field>
        <div className="flex justify-end"><Button variant="primary" type="submit" loading={busy}>Update password</Button></div>
      </form>
      <div className="card border-danger/30 p-5">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-danger"><ShieldAlert size={15} /> Danger zone</h3>
        <p className="mt-1.5 text-xs text-muted">Deactivating signs you out everywhere and blocks future logins.</p>
        <Button variant="danger" className="mt-3" onClick={deactivate}>Deactivate account</Button>
      </div>
    </div>
  )
}

export default function Profile() {
  const { user } = useAuth()
  const tasks$ = useApi(getMyTasks, [])
  const spaces$ = useApi(getMyWorkspaces, [])
  const [tab, setTab] = useState('work')
  const [filter, setFilter] = useState('open')

  const tasks = useMemo(() => tasks$.data?.tasks || [], [tasks$.data])
  const spaces = spaces$.data?.allSpace || []
  const shown = tasks.filter((t) => (filter === 'open' ? t.status !== 'done' : filter === 'all' ? true : t.status === filter))
  const count = (s) => tasks.filter((t) => t.status === s).length

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-4 sm:p-8">
      <div className="card flex flex-wrap items-center gap-5 p-5 sm:p-6">
        <Avatar user={user} size={72} />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-semibold text-fg sm:text-2xl">{user.name}</h1>
          <p className="truncate text-[13px] text-muted">{user.email}</p>
          <p className="mt-1 text-xs text-faint">Member since {formatDate(user.createdAt, { month: 'long', year: 'numeric' })}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Assigned tasks" value={tasks.length} icon={ListChecks} />
        <StatCard label="In progress" value={count('in_progress')} icon={CircleDot} tone="text-brand" />
        <StatCard label="Done" value={count('done')} icon={CheckCircle2} tone="text-accent" />
        <StatCard label="Workspaces" value={spaces.length} icon={Building2} />
      </div>

      <Tabs value={tab} onChange={setTab} tabs={[{ key: 'work', label: 'My work', icon: ListChecks }, { key: 'workspaces', label: 'Workspaces', icon: Building2, count: spaces.length }, { key: 'details', label: 'Details', icon: UserRound }, { key: 'security', label: 'Security', icon: KeyRound }]} />

      {tab === 'work' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {[['open', 'Open'], ['in_progress', 'In progress'], ['review', 'In review'], ['done', 'Done'], ['all', 'All']].map(([k, l]) => (
              <button key={k} onClick={() => setFilter(k)} className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${filter === k ? 'border-brand bg-brand/15 text-brand' : 'border-line bg-card text-muted hover:text-fg'}`}>{l}</button>
            ))}
          </div>
          {tasks$.loading ? <Skeleton className="h-48" /> : shown.length === 0 ? (
            <EmptyState icon={ListChecks} title="Nothing here" message="Issues assigned to you will show up in this list." />
          ) : (
            <div className="card divide-y divide-line">
              {shown.map((t) => {
                const due = dueInfo(t.dueDate, t.status === 'done')
                return (
                  <Link key={t._id} to={`/workspaces/${t.workSpace}/tasks/${t.project?._id}/${t._id}`} className="flex flex-wrap items-center gap-3 px-4 py-3 transition hover:bg-raised/60">
                    <PriorityIcon priority={t.priority} />
                    <span className="w-16 font-mono text-[11px] text-muted">{taskKey(t)}</span>
                    <span className={`min-w-0 flex-1 truncate text-[13px] ${t.status === 'done' ? 'text-faint line-through' : 'text-fg'}`}>{t.title}</span>
                    <span className="hidden text-xs text-faint md:block">{t.workSpaceName}</span>
                    {due && <span className={`font-mono text-[11px] ${due.tone}`}>{due.label}</span>}
                    <span className="rounded bg-raised px-1.5 py-0.5 font-mono text-[10px] text-muted">{t.points} pt</span>
                    <StatusPill status={t.status} />
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      )}

      {tab === 'workspaces' && (
        spaces.length === 0 ? <EmptyState icon={Building2} title="No workspaces" /> : (
          <div className="grid gap-3 sm:grid-cols-2">
            {spaces.map((w) => (
              <Link key={w._id} to={`/workspaces/${w._id}/sprint`} className="card flex items-center gap-3 p-4 transition hover:border-line-strong">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/15 font-bold text-brand">{w.name[0]?.toUpperCase()}</span>
                <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-fg">{w.name}</span><span className="text-xs text-muted">{w.memberCount} members</span></span>
                <Badge className={`${ROLE_STYLES[w.myRole]} capitalize`}>{w.myRole}</Badge>
              </Link>
            ))}
          </div>
        )
      )}
      {tab === 'details' && <Details />}
      {tab === 'security' && <Security />}
    </div>
  )
}
