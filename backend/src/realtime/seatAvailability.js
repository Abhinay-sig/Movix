const { Server } = require('socket.io');

let io = null;

function showRoom(showId) {
  return `show:${showId}`;
}

function initSeatAvailabilityRealtime(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: true,
      credentials: true,
    },
    transports: ['websocket'],
  });

  io.on('connection', (socket) => {
    socket.on('show:join', ({ showId } = {}) => {
      const normalizedShowId = Number(showId);
      if (!Number.isInteger(normalizedShowId) || normalizedShowId <= 0) return;
      socket.join(showRoom(normalizedShowId));
    });

    socket.on('show:leave', ({ showId } = {}) => {
      const normalizedShowId = Number(showId);
      if (!Number.isInteger(normalizedShowId) || normalizedShowId <= 0) return;
      socket.leave(showRoom(normalizedShowId));
    });
  });

  return io;
}

function emitSeatAvailabilityChanged(showId, payload = {}) {
  if (!io) return;

  const normalizedShowId = Number(showId);
  if (!Number.isInteger(normalizedShowId) || normalizedShowId <= 0) return;

  io.to(showRoom(normalizedShowId)).emit('seatmap:changed', {
    showId: normalizedShowId,
    changedAt: new Date().toISOString(),
    ...payload,
  });
}

module.exports = {
  initSeatAvailabilityRealtime,
  emitSeatAvailabilityChanged,
};
