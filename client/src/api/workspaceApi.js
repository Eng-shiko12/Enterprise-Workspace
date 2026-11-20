import api, { unwrap } from './client'

const ws = (id) => `/workspaces/${id}`

export const getMyWorkspaces = () => unwrap(api.get('/workspaces'))
export const createWorkspace = (body) => unwrap(api.post('/workspaces', body))
export const getWorkspaceDetails = (id) => unwrap(api.get(ws(id)))
export const updateWorkspace = (id, body) => unwrap(api.patch(ws(id), body))
export const deleteWorkspace = (id) => unwrap(api.delete(ws(id)))
export const inviteMember = (id, body) => unwrap(api.post(`${ws(id)}/invite`, body))
export const respondToInvite = (id, response) => unwrap(api.patch(`${ws(id)}/invite/respond`, { response }))
export const updateMemberRole = (id, userId, role) => unwrap(api.patch(`${ws(id)}/members/${userId}`, { role }))
export const removeMember = (id, userId) => unwrap(api.delete(`${ws(id)}/members/${userId}`))
export const leaveWorkspace = (id) => unwrap(api.delete(`${ws(id)}/leave`))
export const getWorkspaceAnalytics = (id, projectId) =>
  unwrap(api.get(`${ws(id)}/analytics`, { params: projectId ? { projectId } : {} }))
export const getActivityLogs = (id, params) => unwrap(api.get(`${ws(id)}/logs`, { params }))
