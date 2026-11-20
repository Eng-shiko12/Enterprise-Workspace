import { NavLink, useNavigate } from 'react-router-dom'
import { BarChart3, Building2, ChevronsUpDown, Columns3, Layers, LayoutList, Plus, Settings, Users, X, Zap } from 'lucide-react'
import { Avatar, Logo, Menu } from '../ui'
import { useApi, useAuth, useWorkspace } from '../../hooks'
import { getMyWorkspaces } from '../../api/workspaceApi'
import { PROJECT_STATUS_MAP, ROLE_STYLES } from '../../lib/constants'

const linkClass = ({ isActive }) =>
  `group flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition ${
    isActive ? 'bg-raised text-fg' : 'text-muted hover:bg-raised/60 hover:text-fg'
  }`

function NavItem({ to, icon: Icon, children, end, dot }) {
  return (
    <NavLink to={to} end={end} className={linkClass}>
      <Icon size={16} className="shrink-0" />
      <span className="flex-1 truncate">{children}</span>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_8px_var(--accent)]" />}
    </NavLink>
  )
}

const Section = ({ children }) => <p className="label px-3 pt-5 pb-1.5">{children}</p>

function WorkspaceSwitcher({ workspace, role }) {
  const navigate = useNavigate()
  const { data } = useApi(getMyWorkspaces, [])
  const spaces = data?.allSpace || []

  const items = [
    ...spaces.map((w) => ({
      label: w.name,
      icon: Building2,
      active: w._id === workspace?._id,
      onClick: () => navigate(`/workspaces/${w._id}/sprint`),
    })),
    { separator: true },
    { label: 'All workspaces', icon: Layers, onClick: () => navigate('/workspaces') },
  ]

  return (
    <Menu
      align="left"
      width="w-60"
      items={items}
      trigger={
        <button className="flex w-full items-center gap-3 rounded-xl border border-line bg-card px-3 py-2.5 text-left transition hover:border-line-strong">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand/15 text-sm font-bold text-brand">
            {workspace?.name?.[0]?.toUpperCase() || 'W'}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-semibold text-fg">{workspace?.name || 'Workspace'}</span>
            <span className={`mt-0.5 inline-block rounded px-1.5 text-[10px] font-medium capitalize ${ROLE_STYLES[role] || ''}`}>{role}</span>
          </span>
          <ChevronsUpDown size={14} className="text-faint" />
        </button>
      }
    />
  )
}

export default function Sidebar({ open, onClose, onNewIssue }) {
  const { user } = useAuth()
  const { id, workspace, myRole, projects, boards } = useWorkspace()
  const base = `/workspaces/${id}`
  const hasActive = projects.some((p) => p.status === 'active')

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 flex w-[264px] shrink-0 flex-col border-r border-line bg-panel transition-transform lg:static lg:translate-x-0 ${
        open ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      <div className="flex h-14 items-center justify-between px-4">
        <NavLink to="/workspaces">
          <Logo size={28} />
        </NavLink>
        <button className="rounded-lg p-1.5 text-muted hover:bg-raised lg:hidden" onClick={onClose} aria-label="Close menu">
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-3">
        {id ? (
          <>
            <WorkspaceSwitcher workspace={workspace} role={myRole} />
            <button onClick={onNewIssue} className="btn btn-primary mt-3 w-full justify-between">
              <span className="flex items-center gap-2"><Plus size={15} /> New Issue</span>
              <span className="rounded bg-white/20 px-1.5 font-mono text-[10px]">C</span>
            </button>

            <nav className="mt-4 space-y-0.5">
              <NavItem to={`${base}/sprint`} icon={Zap} dot={hasActive}>Active Sprint</NavItem>
              <NavItem to={`${base}/backlog`} icon={LayoutList}>Backlog &amp; Planning</NavItem>
              <NavItem to={`${base}/boards`} icon={Columns3}>Boards</NavItem>
              <NavItem to={`${base}/insights`} icon={BarChart3}>Insights &amp; Velocity</NavItem>
              <NavItem to={`${base}/team`} icon={Users}>Team &amp; Access</NavItem>
            </nav>

            {projects.length > 0 && (
              <>
                <Section>Projects</Section>
                <div className="space-y-0.5">
                  {projects.slice(0, 8).map((p) => (
                    <NavLink key={p._id} to={`${base}/sprint?project=${p._id}`} className="flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-[13px] text-muted hover:bg-raised/60 hover:text-fg">
                      <span className={`h-2 w-2 shrink-0 rounded-full ${p.status === 'active' ? 'bg-accent' : p.status === 'completed' ? 'bg-ok' : 'bg-brand'}`} title={PROJECT_STATUS_MAP[p.status]?.label} />
                      <span className="truncate">{p.title}</span>
                      {p.key && <span className="ml-auto font-mono text-[10px] text-faint">{p.key}</span>}
                    </NavLink>
                  ))}
                </div>
              </>
            )}

            {boards.length > 0 && (
              <>
                <Section>Boards</Section>
                <div className="space-y-0.5">
                  {boards.slice(0, 6).map((b) => (
                    <NavLink key={b._id} to={`${base}/boards/${b._id}`} className="flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-[13px] text-muted hover:bg-raised/60 hover:text-fg">
                      <Columns3 size={13} className="shrink-0 text-faint" />
                      <span className="truncate">{b.title}</span>
                    </NavLink>
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <nav className="mt-2 space-y-0.5">
            <NavItem to="/workspaces" icon={Building2}>Workspaces</NavItem>
            <NavItem to="/profile" icon={Settings}>Profile &amp; Security</NavItem>
          </nav>
        )}
      </div>

      <NavLink to="/profile" className="flex items-center gap-3 border-t border-line px-4 py-3 transition hover:bg-raised/60">
        <Avatar user={user} size={32} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-medium text-fg">{user?.name}</span>
          <span className="block truncate text-[11px] text-faint">Profile &amp; settings</span>
        </span>
        <Settings size={14} className="text-faint" />
      </NavLink>
    </aside>
  )
}
