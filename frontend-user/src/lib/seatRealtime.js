import { io } from 'socket.io-client'

function resolveSocketBase() {
  const configuredBase = import.meta.env.VITE_API_BASE_URL
  if (configuredBase) return configuredBase.replace(/\/api\/?$/, '')
  if (import.meta.env.DEV) return 'http://localhost:3001'
  return window.location.origin
}

export function createSeatRealtimeClient({ showId, onSeatMapChanged }) {
  const socket = io(resolveSocketBase(), {
    transports: ['websocket'],
    autoConnect: true,
  })
  const normalizedShowId = Number(showId)

  function joinShowRoom() {
    socket.emit('show:join', { showId: normalizedShowId })
  }

  function handleSeatMapChanged(payload) {
    if (Number(payload?.showId) !== normalizedShowId) return
    onSeatMapChanged?.(payload)
  }

  socket.on('connect', joinShowRoom)
  socket.on('seatmap:changed', handleSeatMapChanged)
  if (socket.connected) joinShowRoom()

  return {
    socket,
    disconnect() {
      socket.emit('show:leave', { showId: normalizedShowId })
      socket.off('connect', joinShowRoom)
      socket.off('seatmap:changed', handleSeatMapChanged)
      socket.disconnect()
    },
  }
}
