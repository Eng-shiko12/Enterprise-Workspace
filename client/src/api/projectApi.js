import api, { unwrap } from './client'

const ws = (id) => `/workspaces/${id}`

// Projects (sprints / cycles)
export const getProjects = (w) => unwrap(api.get(`${ws(w)}/projects`))
export const createProject = (w, body) => unwrap(api.post(`${ws(w)}/projects`, body))
export const updateProject = (w, id, body) => unwrap(api.patch(`${ws(w)}/projects/${id}`, body))
export const deleteProject = (w, id) => unwrap(api.delete(`${ws(w)}/projects/${id}`))

// Tasks
export const getWorkspaceTasks = (w, params) => unwrap(api.get(`${ws(w)}/tasks`, { params }))
export const getProjectTasks = (w, p, params) => unwrap(api.get(`${ws(w)}/projects/${p}/tasks`, { params }))
export const getTask = (w, p, t) => unwrap(api.get(`${ws(w)}/projects/${p}/tasks/${t}`))
export const createTask = (w, p, body) => unwrap(api.post(`${ws(w)}/projects/${p}/tasks`, body))
export const updateTask = (w, p, t, body) => unwrap(api.patch(`${ws(w)}/projects/${p}/tasks/${t}`, body))
export const deleteTask = (w, p, t) => unwrap(api.delete(`${ws(w)}/projects/${p}/tasks/${t}`))

// Comments
export const getComments = (w, p, t) => unwrap(api.get(`${ws(w)}/projects/${p}/tasks/${t}/comments`))
export const addComment = (w, p, t, content) => unwrap(api.post(`${ws(w)}/projects/${p}/tasks/${t}/comments`, { content }))
export const updateComment = (w, id, content) => unwrap(api.patch(`${ws(w)}/comments/${id}`, { content }))
export const deleteComment = (w, id) => unwrap(api.delete(`${ws(w)}/comments/${id}`))
