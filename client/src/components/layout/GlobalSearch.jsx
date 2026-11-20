import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, CornerDownLeft, Columns3, Search, SquareCheck, StickyNote } from 'lucide-react'
import { globalSearch } from '../../api/searchApi'
import { useDebounced } from '../../hooks'
import { Spinner } from '../ui'

export default function GlobalSearch({ open, onClose }) {
  const [q, setQ] = useState('')
  const [state, setState] = useState({ q: '', results: null })
  const [cursor, setCursor] = useState(0)
  const inputRef = useRef(null)
  const navigate = useNavigate()
  const term = useDebounced(q.trim(), 250)

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 30)
  }, [open])

  useEffect(() => {
    if (!open || !term) return undefined
    const ctrl = new AbortController()
    globalSearch(term, 'all', ctrl.signal)
      .then((results) => {
        setState({ q: term, results })
        setCursor(0)
      })
      .catch(() => {})
    return () => ctrl.abort()
  }, [term, open])

  const loading = Boolean(term) && state.q !== term
  const results = term ? state.results : null

  const rows = useMemo(() => {
    if (!results) return []
    return [
      ...results.tasks.map((t) => ({ id: t._id, icon: SquareCheck, title: t.title, meta: `${t.key || 'Task'} · ${t.workSpaceName}`, to: `/workspaces/${t.workSpace}/tasks/${t.project}/${t._id}` })),
      ...results.boards.map((b) => ({ id: b._id, icon: Columns3, title: b.title, meta: `Board · ${b.workSpaceName}`, to: `/workspaces/${b.workSpace}/boards/${b._id}` })),
      ...results.cards.map((c) => ({ id: c._id, icon: StickyNote, title: c.title, meta: `Card · ${c.boardTitle}`, to: `/workspaces/${c.workSpace}/boards/${c.board}` })),
      ...results.workspaces.map((w) => ({ id: w._id, icon: Building2, title: w.name, meta: 'Workspace', to: `/workspaces/${w._id}/sprint` })),
    ]
  }, [results])

  const close = () => {
    setQ('')
    setState({ q: '', results: null })
    onClose()
  }
  const go = (row) => {
    close()
    navigate(row.to)
  }
  const onKeyDown = (e) => {
    if (e.key === 'Escape') close()
    else if (e.key === 'ArrowDown') { e.preventDefault(); setCursor((c) => Math.min(c + 1, rows.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setCursor((c) => Math.max(c - 1, 0)) }
    else if (e.key === 'Enter' && rows[cursor]) go(rows[cursor])
  }

  if (!open) return null
  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center px-4 pt-[12vh]" onKeyDown={onKeyDown}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onMouseDown={close} />
      <div className="animate-in relative w-full max-w-xl overflow-hidden rounded-2xl border border-line-strong bg-panel shadow-2xl">
        <div className="flex items-center gap-3 border-b border-line px-4">
          <Search size={16} className="text-faint" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search issues, boards, cards, workspaces…"
            className="h-12 flex-1 bg-transparent text-sm text-fg outline-none placeholder:text-faint"
          />
          {loading ? <Spinner /> : <span className="kbd">esc</span>}
        </div>
        <div className="max-h-[50vh] overflow-y-auto p-2">
          {!term && <p className="px-3 py-8 text-center text-xs text-faint">Type to search across all of your workspaces.</p>}
          {term && !loading && rows.length === 0 && <p className="px-3 py-8 text-center text-xs text-faint">No results for “{term}”.</p>}
          {rows.map((r, i) => (
            <button
              key={`${r.meta}-${r.id}`}
              onMouseEnter={() => setCursor(i)}
              onClick={() => go(r)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left ${i === cursor ? 'bg-raised' : ''}`}
            >
              <r.icon size={15} className="shrink-0 text-muted" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] text-fg">{r.title}</span>
                <span className="block truncate text-[11px] text-faint">{r.meta}</span>
              </span>
              {i === cursor && <CornerDownLeft size={13} className="text-faint" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
