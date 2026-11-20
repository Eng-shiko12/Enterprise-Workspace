import { Outlet } from 'react-router-dom'
import { ShieldAlert } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button, EmptyState, PageLoader } from '../../components/ui'
import { useWorkspace } from '../../hooks'
import { getErrorMessage } from '../../lib/errors'

/** Renders workspace pages only once the workspace has loaded (and the user is allowed in) */
export default function WorkspaceGate() {
  const { loading, error, workspace, reload } = useWorkspace()

  if (loading) return <PageLoader label="Loading workspace…" />
  if (error || !workspace) {
    const status = error?.response?.status
    return (
      <div className="mx-auto max-w-lg px-6 py-20">
        <EmptyState
          icon={ShieldAlert}
          title={status === 404 || status === 403 ? 'Workspace unavailable' : 'Could not load workspace'}
          message={status === 404 || status === 403 ? 'It may have been deleted, or you are not an active member.' : getErrorMessage(error)}
          action={
            <div className="flex gap-2">
              <Button onClick={reload}>Retry</Button>
              <Link to="/workspaces" className="btn btn-primary">All workspaces</Link>
            </div>
          }
        />
      </div>
    )
  }
  return <Outlet />
}
