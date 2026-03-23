/**
 * hooks/useSocket.js
 * Subscribe to Socket.io room events with automatic cleanup.
 *
 * Usage:
 *   useSocket(`job:${jobId}`, 'job:status', (data) => setStatus(data.status))
 */
import { useEffect, useRef } from 'react'
import { getSocket, joinRoom, leaveRoom } from '../services/socket'

export function useSocket(room, event, handler) {
  const handlerRef = useRef(handler)
  handlerRef.current = handler

  useEffect(() => {
    const socket = getSocket()
    if (!socket || !room || !event) return

    joinRoom(room)
    const wrappedHandler = (data) => handlerRef.current(data)
    socket.on(event, wrappedHandler)

    return () => {
      socket.off(event, wrappedHandler)
      leaveRoom(room)
    }
  }, [room, event])
}

/**
 * Listen to multiple events in a single room.
 * handlers: { 'job:status': (data) => ..., 'job:error': (data) => ... }
 */
export function useSocketRoom(room, handlers = {}) {
  useEffect(() => {
    const socket = getSocket()
    if (!socket || !room) return

    joinRoom(room)

    const registered = []
    for (const [event, fn] of Object.entries(handlers)) {
      socket.on(event, fn)
      registered.push([event, fn])
    }

    return () => {
      for (const [event, fn] of registered) {
        socket.off(event, fn)
      }
      leaveRoom(room)
    }
  }, [room])
}
