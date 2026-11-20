import { Link } from 'react-router-dom'
import { BarChart3, Columns3, Zap } from 'lucide-react'
import { Logo } from '../ui'

const FEATURES = [
  { icon: Zap, title: 'Sprint boards that keep up', text: 'Drag issues across a realtime kanban and see your team move in sync.' },
  { icon: BarChart3, title: 'Velocity you can trust', text: 'Burndown, cycle time and workload — calculated from real task data.' },
  { icon: Columns3, title: 'Flexible boards', text: 'Free-form lists and cards for roadmaps, ideas and anything else.' },
]

function Preview() {
  const cols = [
    { name: 'To Do', dot: 'bg-slate-400', cards: ['Migrate session store', 'Webhook retries'] },
    { name: 'In Progress', dot: 'bg-brand', cards: ['OAuth 2.1 PKCE', 'GraphQL memory leak'] },
    { name: 'Done', dot: 'bg-accent', cards: ['Read-replica scaling'] },
  ]
  return (
    <div className="mt-10 grid grid-cols-3 gap-3 opacity-90" aria-hidden>
      {cols.map((c) => (
        <div key={c.name} className="rounded-xl border border-line bg-card/70 p-2.5">
          <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold tracking-wider text-muted uppercase">
            <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />{c.name}
          </div>
          <div className="space-y-2">
            {c.cards.map((t, i) => (
              <div key={t} className="rounded-lg border border-line bg-panel p-2">
                <div className="font-mono text-[9px] text-faint">COR-{10 + i * 7}</div>
                <div className="mt-0.5 text-[11px] leading-snug text-fg">{t}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="grid min-h-full bg-app lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden overflow-hidden border-r border-line bg-panel p-12 lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full bg-brand/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-accent/10 blur-3xl" />
        <Logo size={36} />
        <div className="relative max-w-lg">
          <h2 className="text-4xl leading-tight font-semibold tracking-tight text-fg">
            Plan sprints. Ship faster.<br /><span className="text-brand">Stay in flow.</span>
          </h2>
          <ul className="mt-8 space-y-5">
            {FEATURES.map((f) => (
              <li key={f.title} className="flex gap-3.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line bg-card text-accent"><f.icon size={16} /></span>
                <span>
                  <span className="block text-sm font-semibold text-fg">{f.title}</span>
                  <span className="block text-[13px] leading-relaxed text-muted">{f.text}</span>
                </span>
              </li>
            ))}
          </ul>
          <Preview />
        </div>
        <p className="relative text-xs text-faint">© {new Date().getFullYear()} Vortex. Built for engineering teams.</p>
      </aside>

      <main className="flex items-center justify-center px-5 py-12">
        <div className="animate-in w-full max-w-[400px]">
          <div className="mb-8 lg:hidden"><Link to="/login"><Logo /></Link></div>
          <h1 className="text-2xl font-semibold tracking-tight text-fg">{title}</h1>
          {subtitle && <p className="mt-1.5 text-sm text-muted">{subtitle}</p>}
          <div className="mt-7">{children}</div>
          {footer && <div className="mt-6 text-center text-[13px] text-muted">{footer}</div>}
        </div>
      </main>
    </div>
  )
}
