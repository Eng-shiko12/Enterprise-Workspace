import api, { unwrap } from './client'

export const globalSearch = (q, type = 'all', signal) => unwrap(api.get('/search', { params: { q, type }, signal }))
