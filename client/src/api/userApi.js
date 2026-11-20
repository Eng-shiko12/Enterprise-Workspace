import api, { unwrap } from './client'

export const updateProfile = (body) => unwrap(api.patch('/users/update-profile', body))
export const changePassword = (body) => unwrap(api.patch('/users/change-password', body))
export const getMyTasks = () => unwrap(api.get('/users/me/tasks'))
export const deactivateAccount = () => unwrap(api.delete('/users/delete-me'))
