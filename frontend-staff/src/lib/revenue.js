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

export function downloadRevenueCsv(data, fileName = 'revenue-report.csv') {
  const lines = [
    ['Section', 'Name', 'Value 1', 'Value 2', 'Value 3', 'Value 4'].join(','),
    ['Summary', 'Gross Revenue', Number(data?.totals?.grossRevenue || 0), '', '', ''].join(','),
    ['Summary', 'Platform Fee', Number(data?.totals?.platformFee || 0), '', '', ''].join(','),
    ['Summary', 'GST', Number(data?.totals?.gst || 0), '', '', ''].join(','),
    ['Summary', 'Net Earnings', Number(data?.totals?.netEarnings || 0), '', '', ''].join(','),
  ]

  for (const row of data?.moviePerformance || []) {
    lines.push(
      [
        'Movie Performance',
        row.movieName,
        row.ticketsSold,
        Number(row.revenue || 0),
        Number(row.occupancyPct || 0).toFixed(2),
        row.showCount,
      ].join(',')
    )
  }

  for (const row of data?.theaterBreakdown || []) {
    lines.push(
      [
        'Theater Breakdown',
        row.theaterName,
        Number(row.grossRevenue || 0),
        row.ticketsSold,
        Number(row.occupancyPct || 0).toFixed(2),
        Number(row.averageTicketPrice || 0).toFixed(2),
      ].join(',')
    )
  }

  for (const row of data?.recentBookings || []) {
    lines.push(
      [
        'Recent Booking',
        row.user,
        row.movie,
        row.theater,
        Array.isArray(row.seats) ? `"${row.seats.join(' | ')}"` : '',
        Number(row.amount || 0),
      ].join(',')
    )
  }

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.click()
  URL.revokeObjectURL(url)
}
