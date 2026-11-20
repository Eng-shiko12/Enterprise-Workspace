import { Link } from 'react-router-dom'
import { Compass } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-4 bg-app px-6 py-24 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-raised text-muted"><Compass size={26} /></span>
      <h1 className="text-2xl font-semibold text-fg">Page not found</h1>
      <p className="max-w-sm text-sm text-muted">The page you are looking for does not exist or you no longer have access to it.</p>
      <Link to="/workspaces" className="btn btn-primary">Back to workspaces</Link>
    </div>
  )
}
