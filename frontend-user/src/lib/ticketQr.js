import QRCode from 'qrcode'

function sanitizeValue(value, fallback = '') {
  const normalized = String(value ?? '').trim()
  return normalized || fallback
}

export function buildTicketQrValue(ticket) {
  const seatCodes = Array.isArray(ticket?.seats)
    ? ticket.seats.map((seat) => sanitizeValue(seat?.seatCode)).filter(Boolean)
    : []

  return JSON.stringify({
    type: 'movix-entry-ticket',
    bookingId: Number(ticket?.bookingId || 0),
    status: sanitizeValue(ticket?.status, 'confirmed'),
    receiptNumber: sanitizeValue(ticket?.payment?.receiptNumber, `MOVIX-${ticket?.bookingId || 'NA'}`),
    showId: Number(ticket?.show?.showId || 0),
    movieTitle: sanitizeValue(ticket?.show?.movieTitle, 'Movie'),
    theaterName: sanitizeValue(ticket?.show?.theaterName, 'Theater'),
    hallName: sanitizeValue(ticket?.show?.hallName, 'Hall'),
    startsAt: sanitizeValue(ticket?.show?.startsAt, ''),
    language: sanitizeValue(ticket?.show?.language, 'Standard'),
    seats: seatCodes,
    seatCount: seatCodes.length,
    bookedAt: sanitizeValue(ticket?.bookedAt, ''),
  })
}

export async function buildTicketQrDataUrl(ticket, options = {}) {
  return QRCode.toDataURL(buildTicketQrValue(ticket), {
    errorCorrectionLevel: 'M',
    margin: options.margin ?? 1,
    width: options.width ?? 220,
    color: {
      dark: options.dark ?? '#0f172a',
      light: options.light ?? '#ffffffff',
    },
  })
}

export function getTicketQrMatrix(ticket) {
  const qr = QRCode.create(buildTicketQrValue(ticket), {
    errorCorrectionLevel: 'M',
  })

  return {
    size: qr.modules.size,
    data: qr.modules.data,
  }
}
