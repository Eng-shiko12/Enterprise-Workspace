import { useCallback, useEffect, useMemo, useState } from 'react'
import { useMatch, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { WorkspaceContext } from './contexts'
import { getWorkspaceDetails } from '../api/workspaceApi'
import { getProjects } from '../api/projectApi'
import { getBoards } from '../api/boardApi'
import { joinWorkspace, leaveWorkspace, socket } from '../lib/socket'
import { useAuth } from '../hooks'

const REFRESH_EVENTS = ['workspaceUpdated', 'projectUpdated', 'boardCreated', 'boardDeleted']

/**
 * Loads the workspace that is currently in the URL (/workspaces/:id/*) once and shares it
 * (details, members, projects, boards) with the sidebar and every page.
 */
export default function WorkspaceProvider({ children }) {
  const match = useMatch('/workspaces/:workSpaceId/*')
  const id = match?.params.workSpaceId
  const navigate = useNavigate()
  const { user } = useAuth()

  const [state, setState] = useState({ id: null, workspace: null, projects: [], boards: [], error: null })
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (!id) return undefined
    let alive = true
    Promise.all([getWorkspaceDetails(id), getProjects(id), getBoards(id)])
      .then(([w, p, b]) => alive && setState({ id, workspace: w.workSpace, projects: p.projects, boards: b.boards, error: null }))
      .catch((error) => alive && setState({ id, workspace: null, projects: [], boards: [], error }))
    return () => {
      alive = false
    }
  }, [id, tick])

  // Realtime room + debounced refresh when the workspace structure changes
  useEffect(() => {
    if (!id) return undefined
    joinWorkspace(id)
    let timer
    const bump = () => {
      clearTimeout(timer)
      timer = setTimeout(() => setTick((t) => t + 1), 300)
    }
    const onRemoved = (p) => {
      if (p.workspaceId === id) {
        toast.error('You were removed from this workspace')
        navigate('/workspaces', { replace: true })
      }
    }
    REFRESH_EVENTS.forEach((e) => socket.on(e, bump))
    socket.on('removedFromWorkspace', onRemoved)
    return () => {
      clearTimeout(timer)
      REFRESH_EVENTS.forEach((e) => socket.off(e, bump))
      socket.off('removedFromWorkspace', onRemoved)
      leaveWorkspace(id)
    }
  }, [id, navigate])

  const reload = useCallback(() => setTick((t) => t + 1), [])

  const value = useMemo(() => {
    const current = state.id === id && id ? state : null
    const workspace = current?.workspace || null
    const members = (workspace?.members || [])
      .filter((m) => m.status === 'active' && m.user)
      .map((m) => ({ ...m.user, role: m.role, joinedAt: m.joinedAt }))
    const pending = (workspace?.members || []).filter((m) => m.status === 'pending' && m.user)
    const myRole = workspace?.myRole || null
    return {
      id: id || null,
      workspace,
      members,
      pending,
      projects: current?.projects || [],
      boards: current?.boards || [],
      myRole,
      isOwner: myRole === 'owner',
      isStaff: myRole === 'owner' || myRole === 'admin',
      loading: Boolean(id) && !current,
      error: current?.error || null,
      reload,
      currentUserId: user?._id,
    }
  }, [state, id, reload, user?._id])

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
}
