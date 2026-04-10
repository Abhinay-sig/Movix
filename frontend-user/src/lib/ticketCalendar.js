function pad(value) {
  return String(value).padStart(2, '0')
}

function toIcsDate(value) {
  const date = new Date(value)
  return [
    date.getUTCFullYear(),
    pad(date.getUTCMonth() + 1),
    pad(date.getUTCDate()),
    'T',
    pad(date.getUTCHours()),
    pad(date.getUTCMinutes()),
    pad(date.getUTCSeconds()),
    'Z',
  ].join('')
}

function escapeIcs(value) {
  return String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
}

export function downloadCalendarInvite(ticket) {
  if (!ticket?.show?.startsAt || !ticket?.show?.endsAt) return

  const seatList = (ticket.seats || []).map((seat) => seat.seatCode).join(', ') || 'N/A'
  const title = `${ticket.show?.movieTitle || 'Movie'} - Movix Booking`
  const description = [
    `Booking ID: ${ticket.bookingId}`,
    `Theater: ${ticket.show?.theaterName || 'Theater'}`,
    `Hall: ${ticket.show?.hallName || 'Hall'}`,
    `Seats: ${seatList}`,
    `Amount Paid: INR ${Number(ticket.totalAmount || 0)}`,
  ].join('\n')
  const location = `${ticket.show?.theaterName || 'Theater'} - ${ticket.show?.hallName || 'Hall'}`
  const now = new Date()

  const contents = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Movix//Ticket Booking//EN',
    'BEGIN:VEVENT',
    `UID:movix-booking-${ticket.bookingId}@movix.app`,
    `DTSTAMP:${toIcsDate(now)}`,
    `DTSTART:${toIcsDate(ticket.show.startsAt)}`,
    `DTEND:${toIcsDate(ticket.show.endsAt)}`,
    `SUMMARY:${escapeIcs(title)}`,
    `DESCRIPTION:${escapeIcs(description)}`,
    `LOCATION:${escapeIcs(location)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')

  const blob = new Blob([contents], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `movix-booking-${ticket.bookingId}.ics`
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
