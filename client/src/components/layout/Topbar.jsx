import { Link, useLocation, useNavigate } from 'react-router-dom'
import { LogOut, Menu as MenuIcon, Moon, Search, Sun, User as UserIcon } from 'lucide-react'
import toast from 'react-hot-toast'
import { Avatar, IconButton, Menu } from '../ui'
import NotificationsMenu from './NotificationsMenu'
import { useAuth, useTheme, useWorkspace } from '../../hooks'
import { sprintClock } from '../../lib/format'

const PAGE_NAMES = {
  sprint: 'Active Sprint', backlog: 'Backlog & Planning', insights: 'Insights & Velocity',
  boards: 'Boards', team: 'Team & Access', tasks: 'Issue',
}

export default function Topbar({ onMenu, onSearch }) {
  const { user, logout } = useAuth()
  const { theme, toggle } = useTheme()
  const { id, workspace, projects } = useWorkspace()
  const { pathname } = useLocation()
  const navigate = useNavigate()

  const segment = pathname.split('/')[3]
  const page = id ? PAGE_NAMES[segment] : pathname.startsWith('/profile') ? 'Profile & Security' : 'Workspaces'
  const active = projects.find((p) => p.status === 'active')
  const clock = sprintClock(active)

  const signOut = async () => {
    await logout()
    toast.success('Signed out')
    navigate('/login')
  }

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-line bg-panel/80 px-3 backdrop-blur sm:px-5">
      <IconButton label="Open menu" onClick={onMenu} className="lg:hidden"><MenuIcon size={18} /></IconButton>

      <nav className="hidden min-w-0 items-center gap-1.5 text-[13px] sm:flex">
        <Link to="/workspaces" className="text-faint hover:text-fg">Vortex</Link>
        {workspace && (
          <>
            <span className="text-faint">/</span>
            <Link to={`/workspaces/${id}/sprint`} className="max-w-[10rem] truncate text-muted hover:text-fg">{workspace.name}</Link>
          </>
        )}
        <span className="text-faint">/</span>
        <span className="truncate font-semibold text-fg">{page}</span>
      </nav>

      <button
        onClick={onSearch}
        className="mx-auto flex h-9 w-full max-w-sm items-center gap-2.5 rounded-lg border border-line bg-app px-3 text-left text-[13px] text-faint transition hover:border-line-strong sm:ml-4"
      >
        <Search size={14} />
        <span className="flex-1 truncate">Search issues, boards…</span>
        <span className="kbd hidden sm:inline">⌘K</span>
      </button>

      <div className="ml-auto flex items-center gap-1.5">
        {clock && (
          <Link
            to={`/workspaces/${id}/sprint`}
            className="hidden items-center gap-2 rounded-lg border border-line bg-card px-3 py-1.5 text-xs text-muted md:flex"
            title={active.title}
          >
            <span className="h-2 w-2 rounded-full bg-accent shadow-[0_0_8px_var(--accent)]" />
            {active.key || 'Sprint'}: <b className="text-fg">{clock.left} day{clock.left === 1 ? '' : 's'} left</b>
          </Link>
        )}
        <IconButton label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'} onClick={toggle}>
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </IconButton>
        <NotificationsMenu />
        <Menu
          items={[
            { label: 'Profile & security', icon: UserIcon, onClick: () => navigate('/profile') },
            { separator: true },
            { label: 'Sign out', icon: LogOut, danger: true, onClick: signOut },
          ]}
          trigger={<button className="ml-1 rounded-full" aria-label="Account menu"><Avatar user={user} size={32} /></button>}
        />
      </div>
    </header>
  )
}
