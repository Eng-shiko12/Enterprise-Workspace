import api, { unwrap } from './client'

export const getNotifications = () => unwrap(api.get('/notifications'))
export const markRead = (id) => unwrap(api.patch(`/notifications/${id}/read`))
export const markAllRead = () => unwrap(api.patch('/notifications/mark-all-read'))
