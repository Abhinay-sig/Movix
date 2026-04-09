function escapePdfText(value) {
  return String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function buildPdfContent(lines) {
  const commands = ['BT', '/F1 18 Tf', '50 780 Td']
  let firstLine = true

  for (const line of lines) {
    if (!firstLine) commands.push('0 -22 Td')
    commands.push(`(${escapePdfText(line)}) Tj`)
    firstLine = false
  }

  commands.push('ET')
  return commands.join('\n')
}

export function isUpcomingTicket(ticket) {
  const endsAt = ticket?.show?.endsAt ? new Date(ticket.show.endsAt).getTime() : NaN
  const startsAt = ticket?.show?.startsAt ? new Date(ticket.show.startsAt).getTime() : NaN
  const now = Date.now()

  if (Number.isFinite(endsAt)) return endsAt > now
  if (Number.isFinite(startsAt)) return startsAt > now
  return false
}

export function downloadTicketPdf(ticket) {
  if (!ticket || !isUpcomingTicket(ticket)) return

  const seatList = (ticket.seats || []).map((seat) => seat.seatCode).join(', ') || 'N/A'
  const lines = [
    'Movix Ticket',
    `Booking ID: ${ticket.bookingId}`,
    `Movie: ${ticket.show?.movieTitle || 'Movie'}`,
    `Theater: ${ticket.show?.theaterName || 'Theater'}`,
    `Hall: ${ticket.show?.hallName || 'Hall'}`,
    `Showtime: ${ticket.show?.startsAt ? new Date(ticket.show.startsAt).toLocaleString() : 'TBA'}`,
    `Language: ${ticket.show?.language || 'Standard'}`,
    `Seats: ${seatList}`,
    `Total Paid: INR ${Number(ticket.totalAmount || 0)}`,
    `Booked At: ${ticket.bookedAt ? new Date(ticket.bookedAt).toLocaleString() : new Date().toLocaleString()}`,
    'Status: Confirmed',
  ]

  const stream = buildPdfContent(lines)
  const objects = []
  const addObject = (body) => {
    objects.push(body)
    return objects.length
  }

  addObject('<< /Type /Catalog /Pages 2 0 R >>')
  addObject('<< /Type /Pages /Kids [3 0 R] /Count 1 >>')
  addObject('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>')
  addObject(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`)
  addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>')

  let pdf = '%PDF-1.4\n'
  const offsets = [0]

  objects.forEach((body, index) => {
    offsets.push(pdf.length)
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`
  })

  const xrefStart = pdf.length
  pdf += `xref\n0 ${objects.length + 1}\n`
  pdf += '0000000000 65535 f \n'
  for (let index = 1; index < offsets.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`

  const blob = new Blob([pdf], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `movix-ticket-${ticket.bookingId}.pdf`
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
