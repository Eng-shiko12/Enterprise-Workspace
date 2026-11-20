import { io } from 'socket.io-client'
import { SOCKET_URL } from '../api/client'

export const socket = io(SOCKET_URL, { withCredentials: true, autoConnect: false })

// Rooms are remembered so they are re-joined automatically after a reconnect
const rooms = { workspace: new Set(), board: new Set() }

socket.on('connect', () => {
  rooms.workspace.forEach((id) => socket.emit('joinWorkspace', id))
  rooms.board.forEach((id) => socket.emit('joinBoard', id))
})

export const joinWorkspace = (id) => {
  rooms.workspace.add(id)
  if (socket.connected) socket.emit('joinWorkspace', id)
}
export const leaveWorkspace = (id) => {
  rooms.workspace.delete(id)
  if (socket.connected) socket.emit('leaveWorkspace', id)
}
export const joinBoard = (id) => {
  rooms.board.add(id)
  if (socket.connected) socket.emit('joinBoard', id)
}
export const leaveBoard = (id) => {
  rooms.board.delete(id)
  if (socket.connected) socket.emit('leaveBoard', id)
}
