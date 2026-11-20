import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './hooks'
import AppShell from './components/layout/AppShell'
import { PageLoader } from './components/ui'

const Login = lazy(() => import('./pages/auth/Login'))
const Register = lazy(() => import('./pages/auth/Register'))
const VerifyEmail = lazy(() => import('./pages/auth/VerifyEmail'))
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'))
const VerifyResetOtp = lazy(() => import('./pages/auth/VerifyResetOtp'))
const ResetPassword = lazy(() => import('./pages/auth/ResetPassword'))

const WorkspacesHub = lazy(() => import('./pages/workspace/WorkspacesHub'))
const WorkspaceGate = lazy(() => import('./pages/workspace/WorkspaceGate'))
const ActiveSprint = lazy(() => import('./pages/workspace/ActiveSprint'))
const Backlog = lazy(() => import('./pages/workspace/Backlog'))
const IssueDetail = lazy(() => import('./pages/workspace/IssueDetail'))
const Insights = lazy(() => import('./pages/workspace/Insights'))
const Boards = lazy(() => import('./pages/workspace/Boards'))
const BoardView = lazy(() => import('./pages/workspace/BoardView'))
const Team = lazy(() => import('./pages/workspace/Team'))
const Profile = lazy(() => import('./pages/profile/Profile'))
const NotFound = lazy(() => import('./pages/NotFound'))

/** Signed-in users are bounced away from the auth screens */
function PublicOnly({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <PageLoader />
  return user ? <Navigate to="/workspaces" replace /> : children
}

function RequireAuth({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <PageLoader label="Restoring your session…" />
  return user ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
        <Route path="/register" element={<PublicOnly><Register /></PublicOnly>} />
        <Route path="/verify-email" element={<PublicOnly><VerifyEmail /></PublicOnly>} />
        <Route path="/forgot-password" element={<PublicOnly><ForgotPassword /></PublicOnly>} />
        <Route path="/verify-reset-otp" element={<PublicOnly><VerifyResetOtp /></PublicOnly>} />
        <Route path="/reset-password" element={<PublicOnly><ResetPassword /></PublicOnly>} />

        <Route element={<RequireAuth><AppShell /></RequireAuth>}>
          <Route path="/workspaces" element={<WorkspacesHub />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/workspaces/:workSpaceId" element={<WorkspaceGate />}>
            <Route index element={<Navigate to="sprint" replace />} />
            <Route path="sprint" element={<ActiveSprint />} />
            <Route path="backlog" element={<Backlog />} />
            <Route path="projects" element={<Navigate to="../backlog" replace />} />
            <Route path="tasks/:projectId/:taskId" element={<IssueDetail />} />
            <Route path="insights" element={<Insights />} />
            <Route path="boards" element={<Boards />} />
            <Route path="boards/:boardId" element={<BoardView />} />
            <Route path="team" element={<Team />} />
          </Route>
        </Route>

        <Route path="/" element={<Navigate to="/workspaces" replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  )
}
