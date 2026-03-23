/**
 * services/socket.js
 * Socket.io-client singleton.
 * Call connect() once on app load (after login).
 * Pages import { getSocket } to access the instance.
 */
import { io } from 'socket.io-client'

let socket = null

export function connect(token) {
  if (socket?.connected) return socket

  socket = io(import.meta.env.VITE_API_URL || 'http://localhost:3000', {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
  })

  socket.on('connect', () => {
    console.info('[socket] Connected:', socket.id)
  })

  socket.on('disconnect', (reason) => {
    console.warn('[socket] Disconnected:', reason)
  })

  socket.on('connect_error', (err) => {
    console.error('[socket] Connection error:', err.message)
  })

  return socket
}

export function getSocket() {
  return socket
}

export function disconnect() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}

export function joinRoom(room) {
  if (socket?.connected) {
    socket.emit('join', room)
  }
}

export function leaveRoom(room) {
  if (socket?.connected) {
    socket.emit('leave', room)
  }
}
