import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatDateTimeTo12Hour } from './time'

export const REVENUE_RANGE_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: 'last7', label: 'Last 7 days' },
  { value: 'last30', label: 'Last 30 days' },
  { value: 'custom', label: 'Custom' },
]

function pad(value) {
  return String(value).padStart(2, '0')
}

export function toDateInputValue(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function getPresetDateRange(range) {
  const end = new Date()
  end.setHours(0, 0, 0, 0)
  const start = new Date(end)

  if (range === 'last7') start.setDate(start.getDate() - 6)
  else if (range === 'last30') start.setDate(start.getDate() - 29)

  return {
    startDate: toDateInputValue(start),
    endDate: toDateInputValue(end),
  }
}

export function formatCurrency(value) {
  return `₹${Number(value || 0).toFixed(2)}`
}

export function formatPercent(value) {
  return `${Number(value || 0).toFixed(2)}%`
}

function formatPdfCurrency(value) {
  return sanitizeExportValue(`Rs. ${Number(value || 0).toFixed(2)}`, 'Rs. 0.00')
}

function escapeCsv(value) {
  const normalized = sanitizeExportValue(value)
  if (/[",\n]/.test(normalized)) {
    return `"${normalized.replace(/"/g, '""')}"`
  }
  return normalized
}

function downloadBlob(content, fileName, type) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.click()
  URL.revokeObjectURL(url)
}

function formatFilterRange(data) {
  const startDate = data?.appliedFilters?.startDate || ''
  const endDate = data?.appliedFilters?.endDate || ''
  if (startDate && endDate) return `${startDate} to ${endDate}`
  return data?.appliedFilters?.range || 'All'
}

function sanitizeExportValue(value, fallback = 'N/A') {
  const normalized = String(value ?? '').replace(/`/g, '').trim()
  return normalized || fallback
}

function buildAppliedFilterRows(data) {
  return [
    ['Date Range', sanitizeExportValue(formatFilterRange(data), 'All')],
    ['Movie', sanitizeExportValue(data?.selectedLabels?.movieName, 'All')],
    ['Theatre', sanitizeExportValue(data?.selectedLabels?.theaterName, 'All')],
    ['Status', sanitizeExportValue(data?.appliedFilters?.paymentStatus, 'All')],
    ['Seat Category', sanitizeExportValue(data?.appliedFilters?.seatType, 'All')],
    ['Show Time', sanitizeExportValue(data?.appliedFilters?.showTime, 'All')],
    ['City', sanitizeExportValue(data?.appliedFilters?.city, 'All')],
  ]
}

function buildMoviePerformanceRows(data) {
  const aggregate = new Map()

  for (const row of data?.moviePerformance || []) {
    const key = String(row?.movieId ?? row?.movieName ?? '').trim()
    if (!key) continue

    const current = aggregate.get(key) || {
      movieName: sanitizeExportValue(row?.movieName, 'Unknown Movie'),
      ticketsSold: 0,
      revenue: 0,
    }

    current.ticketsSold += Number(row?.ticketsSold || 0)
    current.revenue += Number(row?.revenue || 0)
    aggregate.set(key, current)
  }

  return Array.from(aggregate.values()).sort((a, b) => b.revenue - a.revenue)
}

export function formatRelativeUpdateTime(value) {
  if (!value) return 'Not updated yet'
  const updatedAt = new Date(value)
  if (Number.isNaN(updatedAt.getTime())) return 'Not updated yet'

  const minutes = Math.max(0, Math.floor((Date.now() - updatedAt.getTime()) / 60000))
  if (minutes < 1) return 'Last updated just now'
  if (minutes === 1) return 'Last updated 1 min ago'
  return `Last updated ${minutes} mins ago`
}

// export function downloadRevenueCsv(data, fileName = 'revenue-report.csv') {
//   const rows = []

//   rows.push(['Applied Filters', ''])
//   rows.push(['Filter Name', 'Value'])
//   for (const [label, value] of buildAppliedFilterRows(data)) {
//     rows.push([label, value])
//   }

//   rows.push([])
//   rows.push(['Summary Metrics', ''])
//   rows.push(['Metric', 'Value'])
//   rows.push(['Total Revenue', Number(data?.totals?.grossRevenue || data?.grossRevenue || 0).toFixed(2)])
//   rows.push(['Total Bookings', Number(data?.totalBookings || data?.confirmedBookings || 0)])
//   rows.push(['Tickets Sold', Number(data?.soldTickets || 0)])
//   rows.push(['Platform Fee', Number(data?.totals?.platformFee || data?.platformFee || 0).toFixed(2)])
//   rows.push(['GST', Number(data?.totals?.gst || data?.gst || 0).toFixed(2)])
//   rows.push(['Net Earnings', Number(data?.totals?.netEarnings || data?.netEarnings || 0).toFixed(2)])
//   rows.push(['Avg Ticket Price', Number(data?.totals?.averageTicketPrice || data?.avgTicketPrice || 0).toFixed(2)])
//   rows.push(['Occupancy Rate', formatPercent(data?.totals?.occupancyRate || data?.occupancyRate || 0)])

//   rows.push([])
//   rows.push(['Movie Performance', '', ''])
//   rows.push(['Movie Name', 'Tickets Sold', 'Revenue'])
//   for (const row of buildMoviePerformanceRows(data)) {
//     rows.push([
//       sanitizeExportValue(row.movieName, 'Unknown Movie'),
//       Number(row.ticketsSold || 0),
//       Number(row.revenue || 0).toFixed(2),
//     ])
//   }

//   const csv = rows.map((row) => row.map(escapeCsv).join(',')).join('\n')
//   downloadBlob(csv, fileName, 'text/csv;charset=utf-8;')
// }

export function downloadRevenuePdf(data, fileName = 'revenue-report.pdf') {
  const doc = new jsPDF()
  const moviePerformanceRows = buildMoviePerformanceRows(data)
  const generatedAt = sanitizeExportValue(
    formatDateTimeTo12Hour(new Date(), { timeZone: 'Asia/Kolkata' }),
    ''
  )

  doc.setFillColor(22, 28, 45)
  doc.rect(0, 0, 210, 34, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(20)
  doc.text(sanitizeExportValue('Threatre Revenue Report', ''), 14, 16)

  doc.setFontSize(10)
  doc.text(sanitizeExportValue(`Generated on: ${generatedAt}`, ''), 14, 24)
  doc.text(sanitizeExportValue('Applied filters are included below for traceability.', ''), 14, 30)

  doc.setTextColor(0, 0, 0)

  autoTable(doc, {
    startY: 42,
    head: [['Filter Summary', 'Value']],
    body: buildAppliedFilterRows(data),
    styles: { fontSize: 9, cellPadding: 3, lineColor: [210, 214, 220], lineWidth: 0.2 },
    headStyles: { fillColor: [43, 55, 86], halign: 'left' },
    tableLineColor: [210, 214, 220],
    tableLineWidth: 0.2,
  })

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 8,
    head: [['Main Summary', 'Value']],
    body: [
      ['Total Revenue', formatPdfCurrency(data?.totals?.grossRevenue || data?.grossRevenue || 0)],
      ['Total Tickets Sold', Number(data?.soldTickets || 0)],
      ['Total Bookings', Number(data?.totalBookings || data?.confirmedBookings || 0)],
      ['Platform Fees', formatPdfCurrency(data?.totals?.platformFee || data?.platformFee || 0)],
      ['Net Revenue', formatPdfCurrency(data?.totals?.netEarnings || data?.netEarnings || 0)],
    ],
    styles: { fontSize: 10, cellPadding: 3, lineColor: [210, 214, 220], lineWidth: 0.2 },
    headStyles: { fillColor: [15, 118, 110], halign: 'left' },
    tableLineColor: [210, 214, 220],
    tableLineWidth: 0.2,
  })

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 10,
    head: [['Movie Name', 'Tickets Sold', 'Revenue Generated']],
    body: moviePerformanceRows.map((row) => [
      sanitizeExportValue(row.movieName, 'Unknown Movie'),
      Number(row.ticketsSold || 0),
      formatPdfCurrency(row.revenue || 0),
    ]),
    styles: { fontSize: 9, cellPadding: 3, lineColor: [210, 214, 220], lineWidth: 0.2 },
    headStyles: { fillColor: [37, 99, 235], halign: 'left' },
    tableLineColor: [210, 214, 220],
    tableLineWidth: 0.2,
  })

  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(10)
    doc.setTextColor(90, 98, 112)
    doc.text(sanitizeExportValue('Generated by Movix', ''), 14, 290)
    doc.text(
      sanitizeExportValue(`Page ${i} of ${pageCount}`, ''),
      180,
      290
    )
  }

  doc.save(fileName)
}
