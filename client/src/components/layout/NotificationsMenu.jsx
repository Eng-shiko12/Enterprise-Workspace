import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, CheckCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import { Avatar, IconButton } from '../ui'
import { getNotifications, markAllRead, markRead } from '../../api/notificationApi'
import { useSocketEvent } from '../../hooks'
import { timeAgo } from '../../lib/format'

export default function NotificationsMenu() {
  const [items, setItems] = useState([])
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const navigate = useNavigate()

  const load = useCallback(() => getNotifications().then((d) => setItems(d.notifications || [])).catch(() => {}), [])
  useEffect(() => {
    load()
  }, [load])

  // Realtime push from the API
  useSocketEvent('notification', (n) => {
    setItems((prev) => [n, ...prev.filter((p) => p._id !== n._id)])
    toast(n.message, { icon: '🔔' })
  })

  useEffect(() => {
    if (!open) return undefined
    const away = (e) => !ref.current?.contains(e.target) && setOpen(false)
    document.addEventListener('mousedown', away)
    return () => document.removeEventListener('mousedown', away)
  }, [open])

  const unread = items.filter((n) => !n.isRead).length

  const openItem = async (n) => {
    setOpen(false)
    if (!n.isRead) {
      setItems((prev) => prev.map((p) => (p._id === n._id ? { ...p, isRead: true } : p)))
      markRead(n._id).catch(() => {})
    }
    if (n.link) navigate(n.link)
  }

  const readAll = async () => {
    setItems((prev) => prev.map((p) => ({ ...p, isRead: true })))
    markAllRead().catch(() => {})
  }

  return (
    <div className="relative" ref={ref}>
      <IconButton label="Notifications" onClick={() => setOpen((o) => !o)} className="relative">
        <Bell size={16} />
        {unread > 0 && (
          <span className="absolute top-1 right-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-danger px-1 text-[9px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </IconButton>

      {open && (
        <div className="animate-in fixed top-14 right-2 z-40 w-[min(22rem,calc(100vw-1rem))] overflow-hidden rounded-xl border border-line-strong bg-card shadow-2xl sm:absolute sm:top-auto sm:right-0 sm:mt-1.5">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <h3 className="text-sm font-semibold">Notifications</h3>
            {unread > 0 && (
              <button onClick={readAll} className="flex items-center gap-1 text-xs text-brand hover:underline">
                <CheckCheck size={13} /> Mark all read
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-10 text-center text-xs text-faint">You’re all caught up.</p>
            ) : (
              items.map((n) => (
                <button
                  key={n._id}
                  onClick={() => openItem(n)}
                  className={`flex w-full gap-3 border-b border-line/60 px-4 py-3 text-left transition last:border-0 hover:bg-raised ${n.isRead ? '' : 'bg-brand/5'}`}
                >
                  <Avatar user={n.sender} size={28} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] leading-snug text-fg">{n.message}</span>
                    <span className="mt-1 block text-[11px] text-faint">{timeAgo(n.createdAt)}</span>
                  </span>
                  {!n.isRead && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
