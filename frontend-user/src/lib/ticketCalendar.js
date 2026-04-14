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

function buildCalendarDetails(ticket) {
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

  return { title, description, location }
}

function toGoogleCalendarDate(value) {
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

export function openCalendarAdd(ticket) {
  if (!ticket?.show?.startsAt || !ticket?.show?.endsAt || typeof window === 'undefined') return

  const { title, description, location } = buildCalendarDetails(ticket)
  const url = new URL('https://calendar.google.com/calendar/render')
  url.searchParams.set('action', 'TEMPLATE')
  url.searchParams.set('text', title)
  url.searchParams.set(
    'dates',
    `${toGoogleCalendarDate(ticket.show.startsAt)}/${toGoogleCalendarDate(ticket.show.endsAt)}`
  )
  url.searchParams.set('details', description)
  url.searchParams.set('location', location)
  window.open(url.toString(), '_blank', 'noopener,noreferrer')
}

export function downloadCalendarInvite(ticket) {
  if (!ticket?.show?.startsAt || !ticket?.show?.endsAt) return

  const { title, description, location } = buildCalendarDetails(ticket)
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
