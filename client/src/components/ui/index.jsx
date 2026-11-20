import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle, Check, ChevronDown, Inbox, Loader2, X } from 'lucide-react'
import { colorFor, initials, isUrl } from '../../lib/format'
import { PRIORITY_MAP, STATUS_MAP } from '../../lib/constants'

const cx = (...parts) => parts.filter(Boolean).join(' ')

/* ───────────── Buttons ───────────── */
export function Button({ variant = 'secondary', size, loading, icon: Icon, className, children, ...props }) {
  return (
    <button
      className={cx('btn', `btn-${variant}`, size === 'sm' && 'btn-sm', className)}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? <Loader2 size={14} className="animate-spin" /> : Icon ? <Icon size={14} /> : null}
      {children}
    </button>
  )
}

export function IconButton({ label, className, children, ...props }) {
  return (
    <button
      aria-label={label}
      title={label}
      className={cx(
        'inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted transition hover:bg-raised hover:text-fg disabled:opacity-50',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}

/* ───────────── Form controls ───────────── */
export function Field({ label, hint, error, children, className }) {
  const id = useId()
  return (
    <div className={cx('space-y-1.5', className)}>
      {label && (
        <label htmlFor={id} className="label block">
          {label}
        </label>
      )}
      {typeof children === 'function' ? children(id) : children}
      {error ? <p className="text-xs text-danger">{error}</p> : hint ? <p className="text-xs text-faint">{hint}</p> : null}
    </div>
  )
}

export function Input({ className, ...props }) {
  return <input className={cx('input', className)} {...props} />
}

export function Textarea({ className, rows = 4, ...props }) {
  return <textarea rows={rows} className={cx('input resize-y leading-relaxed', className)} {...props} />
}

export function Select({ className, children, ...props }) {
  return (
    <div className="relative">
      <select className={cx('input appearance-none pr-8', className)} {...props}>
        {children}
      </select>
      <ChevronDown size={14} className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-faint" />
    </div>
  )
}

/* ───────────── Overlay ───────────── */
const SIZES = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }

export function Modal({ open, onClose, title, description, size = 'md', footer, children }) {
  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => e.key === 'Escape' && onClose?.()
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onMouseDown={onClose} />
      <div
        className={cx(
          'animate-in relative flex max-h-[92vh] w-full flex-col rounded-t-2xl border border-line bg-panel shadow-2xl sm:rounded-2xl',
          SIZES[size],
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div>
            <h2 className="text-[15px] font-semibold text-fg">{title}</h2>
            {description && <p className="mt-0.5 text-xs text-muted">{description}</p>}
          </div>
          <IconButton label="Close" onClick={onClose} className="-mt-1 -mr-2">
            <X size={16} />
          </IconButton>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex items-center justify-end gap-2 border-t border-line px-5 py-3">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}

/** Click-to-open popover menu. items: [{ label, icon, onClick, danger, hidden, active }] */
export function Menu({ trigger, items, align = 'right', width = 'w-48' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const away = (e) => !ref.current?.contains(e.target) && setOpen(false)
    const esc = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', away)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', away)
      document.removeEventListener('keydown', esc)
    }
  }, [open])

  const visible = items.filter((i) => !i.hidden)
  return (
    <div className="relative" ref={ref}>
      <div onClick={() => setOpen((o) => !o)}>{trigger}</div>
      {open && (
        <div
          className={cx(
            'animate-in absolute z-40 mt-1.5 rounded-xl border border-line-strong bg-card p-1 shadow-2xl',
            width,
            align === 'right' ? 'right-0' : 'left-0',
          )}
        >
          {visible.map((item, i) =>
            item.separator ? (
              <div key={i} className="my-1 h-px bg-line" />
            ) : (
              <button
                key={item.label}
                onClick={() => {
                  setOpen(false)
                  item.onClick?.()
                }}
                className={cx(
                  'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] transition hover:bg-raised',
                  item.danger ? 'text-danger' : 'text-fg',
                )}
              >
                {item.icon && <item.icon size={14} className={item.danger ? '' : 'text-muted'} />}
                <span className="flex-1 truncate">{item.label}</span>
                {item.active && <Check size={14} className="text-brand" />}
              </button>
            ),
          )}
        </div>
      )}
    </div>
  )
}

/* ───────────── Display ───────────── */
export function Badge({ className, children }) {
  return <span className={cx('badge', className)}>{children}</span>
}

export function StatusPill({ status }) {
  const s = STATUS_MAP[status] || STATUS_MAP.todo
  return (
    <span className={cx('badge', s.pill)}>
      <span className={cx('h-1.5 w-1.5 rounded-full', s.dot)} />
      {s.label}
    </span>
  )
}

/** Signal-bar priority indicator (an exclamation badge for urgent) */
export function PriorityIcon({ priority, size = 14 }) {
  const p = PRIORITY_MAP[priority] || PRIORITY_MAP.medium
  if (p.key === 'urgent') {
    return (
      <span
        title="Urgent"
        className="inline-flex items-center justify-center rounded bg-danger/15 text-danger"
        style={{ width: size + 2, height: size + 2 }}
      >
        <span className="text-[10px] leading-none font-bold">!</span>
      </span>
    )
  }
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" className={p.color} aria-label={`${p.label} priority`}>
      <title>{`${p.label} priority`}</title>
      {[0, 1, 2].map((i) => (
        <rect key={i} x={1 + i * 4.5} y={9 - i * 3.5} width="3" height={4 + i * 3.5} rx="1" fill="currentColor" opacity={i < p.level ? 1 : 0.22} />
      ))}
    </svg>
  )
}

export function Avatar({ user, size = 28, className, ring }) {
  const name = user?.name || '?'
  const style = { width: size, height: size, fontSize: Math.max(10, size * 0.38) }
  if (isUrl(user?.avatar)) {
    return <img src={user.avatar} alt={name} title={name} style={style} className={cx('shrink-0 rounded-full object-cover', ring && 'ring-2 ring-card', className)} />
  }
  return (
    <span
      title={name}
      style={{ ...style, background: colorFor(user?._id || name) }}
      className={cx('inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white select-none', ring && 'ring-2 ring-card', className)}
    >
      {initials(name)}
    </span>
  )
}

export function AvatarStack({ users = [], max = 4, size = 24 }) {
  const shown = users.slice(0, max)
  const extra = users.length - shown.length
  return (
    <div className="flex items-center">
      {shown.map((u, i) => (
        <span key={u._id || i} className={i ? '-ml-1.5' : ''}>
          <Avatar user={u} size={size} ring />
        </span>
      ))}
      {extra > 0 && (
        <span
          style={{ width: size, height: size }}
          className="-ml-1.5 inline-flex items-center justify-center rounded-full bg-raised text-[10px] font-semibold text-muted ring-2 ring-card"
        >
          +{extra}
        </span>
      )}
    </div>
  )
}

export function ProgressBar({ value = 0, tone = 'bg-accent', className }) {
  return (
    <div className={cx('h-1.5 w-full overflow-hidden rounded-full bg-raised', className)}>
      <div className={cx('h-full rounded-full transition-all duration-500', tone)} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  )
}

export function StatCard({ label, value, unit, icon: Icon, tone = 'text-fg', children, className }) {
  return (
    <div className={cx('card p-4', className)}>
      <div className="flex items-start justify-between gap-2">
        <span className="label">{label}</span>
        {Icon && (
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-raised text-muted">
            <Icon size={14} />
          </span>
        )}
      </div>
      <div className="mt-2 flex items-baseline gap-1.5">
        <span className={cx('text-2xl font-semibold tracking-tight tabular-nums', tone)}>{value}</span>
        {unit && <span className="text-xs text-muted">{unit}</span>}
      </div>
      {children}
    </div>
  )
}

/* ───────────── States ───────────── */
export function Spinner({ size = 16, className }) {
  return <Loader2 size={size} className={cx('animate-spin text-muted', className)} />
}

export function PageLoader({ label = 'Loading…' }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-muted">
      <Spinner size={22} />
      <span className="text-xs">{label}</span>
    </div>
  )
}

export function Skeleton({ className }) {
  return <div className={cx('animate-pulse rounded-lg bg-raised', className)} />
}

export function EmptyState({ icon: Icon = Inbox, title, message, action, className }) {
  return (
    <div className={cx('flex flex-col items-center justify-center rounded-xl border border-dashed border-line-strong px-6 py-12 text-center', className)}>
      <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-raised text-muted">
        <Icon size={20} />
      </span>
      <h3 className="text-sm font-semibold text-fg">{title}</h3>
      {message && <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted">{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function ErrorState({ message, onRetry }) {
  return (
    <EmptyState
      icon={AlertTriangle}
      title="Something went wrong"
      message={message}
      action={onRetry && <Button onClick={onRetry}>Try again</Button>}
    />
  )
}

export function Tabs({ tabs, value, onChange }) {
  return (
    <div className="flex gap-1 overflow-x-auto border-b border-line">
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={cx(
            '-mb-px flex items-center gap-2 border-b-2 px-3 py-2.5 text-[13px] font-medium whitespace-nowrap transition',
            value === t.key ? 'border-brand text-fg' : 'border-transparent text-muted hover:text-fg',
          )}
        >
          {t.icon && <t.icon size={14} />}
          {t.label}
          {t.count != null && <span className="rounded bg-raised px-1.5 py-0.5 font-mono text-[10px] text-muted">{t.count}</span>}
        </button>
      ))}
    </div>
  )
}

export function Logo({ size = 32, withText = true }) {
  return (
    <span className="flex items-center gap-2.5">
      <img src="/logo.svg" alt="" width={size} height={size} className="rounded-lg" />
      {withText && <span className="text-[17px] font-semibold tracking-tight text-fg">Vortex</span>}
    </span>
  )
}
