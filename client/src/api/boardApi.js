import api, { unwrap } from './client'

const ws = (id) => `/workspaces/${id}`

export const getBoards = (w) => unwrap(api.get(`${ws(w)}/boards`))
export const createBoard = (w, body) => unwrap(api.post(`${ws(w)}/boards`, body))
export const getBoard = (w, b) => unwrap(api.get(`${ws(w)}/boards/${b}`))
export const updateBoard = (w, b, body) => unwrap(api.patch(`${ws(w)}/boards/${b}`, body))
export const deleteBoard = (w, b) => unwrap(api.delete(`${ws(w)}/boards/${b}`))

export const createList = (w, b, title) => unwrap(api.post(`${ws(w)}/boards/${b}/lists`, { title }))
export const updateList = (w, b, l, body) => unwrap(api.patch(`${ws(w)}/boards/${b}/lists/${l}`, body))
export const deleteList = (w, b, l) => unwrap(api.delete(`${ws(w)}/boards/${b}/lists/${l}`))
export const reorderLists = (w, b, lists) => unwrap(api.patch(`${ws(w)}/boards/${b}/lists/reorder`, { lists }))

export const createCard = (w, l, body) => unwrap(api.post(`${ws(w)}/lists/${l}/cards`, body))
export const updateCard = (w, l, c, body) => unwrap(api.patch(`${ws(w)}/lists/${l}/cards/${c}`, body))
export const deleteCard = (w, l, c) => unwrap(api.delete(`${ws(w)}/lists/${l}/cards/${c}`))
export const moveCard = (w, c, listId, index) => unwrap(api.patch(`${ws(w)}/cards/${c}/move`, { listId, index }))
