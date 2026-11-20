import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import GlobalSearch from './GlobalSearch'
import TaskFormModal from '../TaskFormModal'
import { useWorkspace } from '../../hooks'

const isTyping = (el) => el && (['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) || el.isContentEditable)

export default function AppShell() {
  const { pathname } = useLocation()
  // the drawer closes by itself when the route changes
  const [menu, setMenu] = useState({ open: false, path: pathname })
  const menuOpen = menu.open && menu.path === pathname
  const setMenuOpen = (open) => setMenu({ open, path: pathname })
  const [searchOpen, setSearchOpen] = useState(false)
  const [issueOpen, setIssueOpen] = useState(false)
  const { id: workspaceId } = useWorkspace()

  // Global shortcuts: ⌘/Ctrl+K search, C new issue
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      } else if (e.key.toLowerCase() === 'c' && !e.metaKey && !e.ctrlKey && !e.altKey && !isTyping(e.target) && workspaceId) {
        e.preventDefault()
        setIssueOpen(true)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [workspaceId])

  return (
    <div className="flex h-full bg-app text-fg">
      {menuOpen && <div className="fixed inset-0 z-30 bg-black/60 lg:hidden" onClick={() => setMenuOpen(false)} />}
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} onNewIssue={() => setIssueOpen(true)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onMenu={() => setMenuOpen(true)} onSearch={() => setSearchOpen(true)} />
        <main className="min-h-0 flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
      {workspaceId && <TaskFormModal open={issueOpen} onClose={() => setIssueOpen(false)} />}
    </div>
  )
}
