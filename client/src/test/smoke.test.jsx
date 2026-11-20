import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import * as fx from './fixtures'

// ---- network + realtime are mocked: these tests exercise rendering and wiring only ----
vi.mock('../lib/socket', () => ({
  socket: { on() {}, off() {}, connect() {}, disconnect() {}, emit() {}, connected: false },
  joinWorkspace() {}, leaveWorkspace() {}, joinBoard() {}, leaveBoard() {},
}))
const loggedIn = { current: true }
vi.mock('../api/authApi', () => ({
  getMyProfile: () => (loggedIn.current ? Promise.resolve({ user: fx.me }) : Promise.reject(Object.assign(new Error('no'), { response: { status: 401 } }))),
  loginUser: vi.fn(), logoutUser: vi.fn(), registerUser: vi.fn(), resendOtp: vi.fn(), verifyEmailOtp: vi.fn(),
  forgetPassword: vi.fn(), verifyResetOtp: vi.fn(), resetPassword: vi.fn(),
}))
vi.mock('../api/workspaceApi', () => ({
  getMyWorkspaces: () => Promise.resolve({ allSpace: [{ ...fx.workspace, members: undefined, memberCount: 2 }], pendingInvites: [{ _id: 'w9', name: 'Invited Org', invitedRole: 'member', owner: { name: 'Zed' } }] }),
  getWorkspaceDetails: () => Promise.resolve({ workSpace: fx.workspace }),
  getWorkspaceAnalytics: () => Promise.resolve(fx.analytics),
  getActivityLogs: () => Promise.resolve({ logs: [], currentPage: 1, totalPages: 1 }),
  createWorkspace: vi.fn(), respondToInvite: vi.fn(), updateWorkspace: vi.fn(), deleteWorkspace: vi.fn(),
  inviteMember: vi.fn(), updateMemberRole: vi.fn(), removeMember: vi.fn(), leaveWorkspace: vi.fn(),
}))
vi.mock('../api/projectApi', () => ({
  getProjects: () => Promise.resolve({ projects: fx.projects }),
  getProjectTasks: () => Promise.resolve({ tasks: fx.tasks }),
  getWorkspaceTasks: () => Promise.resolve({ tasks: fx.tasks }),
  getTask: () => Promise.resolve({ task: fx.tasks[0] }),
  getComments: () => Promise.resolve({ comments: [{ _id: 'cm1', content: 'Looks good to me', user: fx.me, createdAt: new Date().toISOString() }] }),
  createTask: vi.fn(), updateTask: vi.fn(), deleteTask: vi.fn(), createProject: vi.fn(), updateProject: vi.fn(),
  deleteProject: vi.fn(), addComment: vi.fn(), updateComment: vi.fn(), deleteComment: vi.fn(),
}))
vi.mock('../api/boardApi', () => ({
  getBoards: () => Promise.resolve({ boards: fx.boards }),
  getBoard: () => Promise.resolve({ board: fx.boardDetail }),
  createBoard: vi.fn(), deleteBoard: vi.fn(), createList: vi.fn(), updateList: vi.fn(), deleteList: vi.fn(),
  reorderLists: vi.fn(), createCard: vi.fn(), updateCard: vi.fn(), deleteCard: vi.fn(), moveCard: vi.fn(),
}))
vi.mock('../api/notificationApi', () => ({
  getNotifications: () => Promise.resolve({ notifications: [{ _id: 'n1', message: 'Marcus assigned you COR-9', isRead: false, sender: fx.me, createdAt: new Date().toISOString(), link: '/workspaces/w1/sprint' }] }),
  markRead: vi.fn(), markAllRead: vi.fn(),
}))
vi.mock('../api/userApi', () => ({
  getMyTasks: () => Promise.resolve({ tasks: fx.tasks.map((t) => ({ ...t, workSpace: 'w1', workSpaceName: 'Vortex Core' })) }),
  updateProfile: vi.fn(), changePassword: vi.fn(), deactivateAccount: vi.fn(),
}))
vi.mock('../api/searchApi', () => ({ globalSearch: () => Promise.resolve({ workspaces: [], boards: [], tasks: [], cards: [] }) }))

import App from '../App'
import ThemeProvider from '../context/ThemeProvider'
import AuthProvider from '../context/AuthProvider'
import WorkspaceProvider from '../context/WorkspaceProvider'
import ConfirmProvider from '../context/ConfirmProvider'

const renderAt = (path) =>
  render(
    <ThemeProvider>
      <MemoryRouter initialEntries={[path]}>
        <AuthProvider>
          <WorkspaceProvider>
            <ConfirmProvider><App /></ConfirmProvider>
          </WorkspaceProvider>
        </AuthProvider>
      </MemoryRouter>
    </ThemeProvider>,
  )

const see = (text) => waitFor(() => expect(screen.getAllByText(text).length).toBeGreaterThan(0), { timeout: 4000 })

describe('public screens', () => {
  it('redirects anonymous users to the login page', async () => {
    loggedIn.current = false
    renderAt('/workspaces')
    await see('Welcome back')
    loggedIn.current = true
  })
  it('renders register, forgot-password and OTP screens', async () => {
    loggedIn.current = false
    renderAt('/register'); await see('Create your account')
    renderAt('/forgot-password'); await see('Reset your password')
    renderAt('/verify-email?email=a@b.co'); await see('Verify your email')
    loggedIn.current = true
  })
})

describe('authenticated screens', () => {
  it('workspaces hub lists workspaces and pending invites', async () => {
    renderAt('/workspaces')
    await see('Your workspaces'); await see('Vortex Core'); await see('Invited Org')
  })

  it('active sprint shows the kanban columns, stats and cards', async () => {
    renderAt('/workspaces/w1/sprint')
    await see('OAuth 2.1 PKCE support')
    await see('To Do'); await see('In Review'); await see('Total scope'); await see('URGENT')
    await see('Sprint 24: Core Engine')
  })

  it('backlog groups issues by sprint', async () => {
    renderAt('/workspaces/w1/backlog')
    await see('Backlog & Planning'); await see('Rate limiter via Lua'); await see('Sprint 25: Reliability')
  })

  it('issue detail renders properties and comments', async () => {
    renderAt('/workspaces/w1/tasks/p1/t1')
    await see('OAuth 2.1 PKCE support'); await see('Looks good to me'); await see('Estimate')
  })

  it('insights renders analytics without crashing', async () => {
    renderAt('/workspaces/w1/insights')
    await see('Team Velocity & Sprint Analytics'); await see('Workload & capacity'); await see('Attention items')
  })

  it('boards list and board view render lists and cards', async () => {
    renderAt('/workspaces/w1/boards'); await see('Product Roadmap')
    renderAt('/workspaces/w1/boards/b1'); await see('Dark API explorer'); await see('Shipped')
  })

  it('team page shows members and pending invites', async () => {
    renderAt('/workspaces/w1/team')
    await see('Team & Access'); await see('Marcus Thorne'); await see('Pending Pat')
  })

  it('profile shows assigned work', async () => {
    renderAt('/profile')
    await see('Elena Rostova'); await see('Assigned tasks'); await see('Rate limiter via Lua')
  })

  it('unknown routes show the 404 page', async () => {
    renderAt('/nope'); await see('Page not found')
  })
})
