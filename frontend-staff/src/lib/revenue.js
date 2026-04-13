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

function escapeCsv(value) {
  const normalized = String(value ?? '')
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

function buildAppliedFilterRows(data) {
  return [
    ['Range', data?.appliedFilters?.range || 'all'],
    ['Start Date', data?.appliedFilters?.startDate || 'All'],
    ['End Date', data?.appliedFilters?.endDate || 'All'],
    ['Show Time', data?.appliedFilters?.showTime || 'All'],
    ['City', data?.appliedFilters?.city || 'All'],
    ['Movie', data?.selectedLabels?.movieName || 'All'],
    ['Theater', data?.selectedLabels?.theaterName || 'All'],
  ]
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

export function downloadRevenueCsv(data, fileName = 'revenue-report.csv') {
  const rows = [
    ['Section', 'Label', 'Value'],
    ['Summary', 'Gross Revenue', Number(data?.totals?.grossRevenue || 0).toFixed(2)],
    ['Summary', 'Platform Fee', Number(data?.totals?.platformFee || 0).toFixed(2)],
    ['Summary', 'GST', Number(data?.totals?.gst || 0).toFixed(2)],
    ['Summary', 'Net Earnings', Number(data?.totals?.netEarnings || 0).toFixed(2)],
    ['Summary', 'Confirmed Bookings', Number(data?.totalBookings || 0)],
    ['Summary', 'Sold Tickets', Number(data?.soldTickets || 0)],
  ]

  for (const [label, value] of buildAppliedFilterRows(data)) {
    rows.push(['Applied Filters', label, value])
  }

  for (const row of data?.moviePerformance || []) {
    rows.push([
      'Movie Performance',
      row.movieName,
      `Revenue ${Number(row.revenue || 0).toFixed(2)} | Tickets ${row.ticketsSold || 0} | Occupancy ${Number(row.occupancyPct || 0).toFixed(2)}%`,
    ])
  }

  for (const row of data?.theaterBreakdown || []) {
    rows.push([
      'Theater Breakdown',
      row.theaterName,
      `Revenue ${Number(row.grossRevenue || 0).toFixed(2)} | Tickets ${row.ticketsSold || 0} | Occupancy ${Number(row.occupancyPct || 0).toFixed(2)}%`,
    ])
  }

  const csv = rows.map((row) => row.map(escapeCsv).join(',')).join('\n')
  downloadBlob(csv, fileName, 'text/csv;charset=utf-8;')
}

export function downloadRevenuePdf(data, fileName = 'revenue-report.pdf') {
  const doc = new jsPDF()

  doc.setFillColor(40, 40, 40)
  doc.rect(0, 0, 210, 30, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(18)
  doc.text('THEATRE REVENUE REPORT', 14, 18)

  doc.setFontSize(10)
  doc.text(`Generated on: ${formatDateTimeTo12Hour(new Date())}`, 14, 25)

  doc.setTextColor(0, 0, 0)

  autoTable(doc, {
    startY: 40,
    head: [['Applied Filters', 'Value']],
    body: buildAppliedFilterRows(data),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [90, 90, 90] },
  })

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 8,
    head: [['Summary', 'Amount (₹)']],
    body: [
      ['Gross Revenue', Number(data?.totals?.grossRevenue || 0).toFixed(2)],
      ['Platform Fee', Number(data?.totals?.platformFee || 0).toFixed(2)],
      ['GST', Number(data?.totals?.gst || 0).toFixed(2)],
      ['Net Earnings', Number(data?.totals?.netEarnings || 0).toFixed(2)],
      ['Confirmed Bookings', Number(data?.totalBookings || 0)],
      ['Sold Tickets', Number(data?.soldTickets || 0)],
    ],
    styles: { fontSize: 10 },
    headStyles: { fillColor: [22, 160, 133] },
  })

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 10,
    head: [['Movie', 'Tickets Sold', 'Revenue (₹)', 'Occupancy %', 'Shows']],
    body: (data?.moviePerformance || []).map(row => [
      row.movieName,
      row.ticketsSold,
      Number(row.revenue || 0).toFixed(2),
      Number(row.occupancyPct || 0).toFixed(2),
      row.showCount,
    ]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [52, 152, 219] },
  })

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 10,
    head: [['Revenue Over Time', 'Revenue (₹)']],
    body: (data?.charts?.revenueOverTime || []).map((row) => [
      row.date,
      Number(row.revenue || 0).toFixed(2),
    ]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [46, 134, 193] },
  })

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 10,
    head: [['Tickets Sold Per Day', 'Tickets Sold']],
    body: (data?.charts?.ticketsSoldPerDay || []).map((row) => [
      row.date,
      Number(row.ticketsSold || 0),
    ]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [39, 174, 96] },
  })

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 10,
    head: [['Theater', 'Revenue (₹)', 'Tickets', 'Occupancy %', 'Avg Price']],
    body: (data?.theaterBreakdown || []).map(row => [
      row.theaterName,
      Number(row.grossRevenue || 0).toFixed(2),
      row.ticketsSold,
      Number(row.occupancyPct || 0).toFixed(2),
      Number(row.averageTicketPrice || 0).toFixed(2),
    ]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [155, 89, 182] },
  })

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 10,
    head: [['User', 'Movie', 'Theater', 'Seats', 'Amount (₹)']],
    body: (data?.recentBookings || []).map(row => [
      row.user,
      row.movie,
      row.theater,
      Array.isArray(row.seats) ? row.seats.join(' | ') : '',
      Number(row.amount || 0).toFixed(2),
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [231, 76, 60] },
  })

  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(10)
    doc.text(
      `Page ${i} of ${pageCount}`,
      180,
      290
    )
  }

  doc.save(fileName)
}
