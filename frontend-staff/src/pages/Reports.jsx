import { useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../AuthContext'

const REPORT_TYPES = [
  { value: 'revenue', label: 'Revenue Report', path: '/admin/reports/revenue' },
  { value: 'bookings', label: 'Booking Report', path: '/admin/reports/bookings' },
  { value: 'theater-performance', label: 'Theater Performance', path: '/admin/reports/theater-performance' },
  { value: 'seat-type', label: 'Seat Type Revenue', path: '/admin/reports/seat-type' },
]

function toCsv(rows, columns) {
  const escape = (value) => {
    const s = String(value ?? '')
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replaceAll('"', '""')}"`
    }
    return s
  }

  const header = columns.map((c) => c.label).join(',')
  const body = rows.map((row) => columns.map((c) => {
    const raw = typeof c.accessor === 'function' ? c.accessor(row) : row[c.accessor]
    return escape(Array.isArray(raw) ? raw.join('|') : raw)
  }).join(','))

  return [header, ...body].join('\n')
}

function columnsFor(type) {
  if (type === 'revenue') {
    return [
      { key: 'date', label: 'Date', accessor: 'date' },
      { key: 'theater', label: 'Theater', accessor: 'theater' },
      { key: 'revenue', label: 'Revenue', accessor: (r) => `₹${r.revenue}` },
    ]
  }
  if (type === 'bookings') {
    return [
      { key: 'date', label: 'Date', accessor: 'date' },
      { key: 'user', label: 'User', accessor: 'user' },
      { key: 'theater', label: 'Theater', accessor: 'theater' },
      { key: 'movie', label: 'Movie', accessor: 'movie' },
      { key: 'seats', label: 'Seats', accessor: (r) => (r.seats || []).join(', ') },
      { key: 'amount', label: 'Amount', accessor: (r) => `₹${r.amount}` },
    ]
  }
  if (type === 'theater-performance') {
    return [
      { key: 'theater', label: 'Theater', accessor: 'theater' },
      { key: 'totalRevenue', label: 'Total Revenue', accessor: (r) => `₹${r.totalRevenue}` },
      { key: 'totalBookings', label: 'Total Bookings', accessor: 'totalBookings' },
    ]
  }
  return [
    { key: 'seatType', label: 'Seat Type', accessor: 'seatType' },
    { key: 'revenue', label: 'Revenue', accessor: (r) => `₹${r.revenue}` },
  ]
}

export default function Reports() {
  const { auth } = useAuth()
  const [type, setType] = useState('revenue')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [theaterId, setTheaterId] = useState('')
  const [theaters, setTheaters] = useState([])
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  const columns = useMemo(() => columnsFor(type), [type])

  useEffect(() => {
    if (!auth?.token) return
    api('/admin/theaters/contribution', { token: auth.token })
      .then((d) => {
        const t = (d.theaters || []).map((x) => ({ id: x.theaterId, name: x.name }))
        setTheaters(t)
      })
      .catch(() => setTheaters([]))
  }, [auth?.token])

  async function applyFilters(nextType = type) {
    if (!auth?.token) return
    setLoading(true)
    setErr('')
    try {
      const report = REPORT_TYPES.find((r) => r.value === nextType) || REPORT_TYPES[0]
      const params = new URLSearchParams()
      if (fromDate) params.set('fromDate', fromDate)
      if (toDate) params.set('toDate', toDate)
      if (theaterId) params.set('theaterId', theaterId)
      const query = params.toString()
      const path = query ? `${report.path}?${query}` : report.path
      const data = await api(path, { token: auth.token })
      setRows(Array.isArray(data) ? data : [])
    } catch (e) {
      setErr(e.message)
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    applyFilters().catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth?.token, type])

  function downloadCsv() {
    if (!rows.length) return
    const csv = toCsv(rows, columns)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${type}-report.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <h2 className="text-4xl font-bold text-white">Reports</h2>
      {err ? <div className="text-red-400 bg-red-900/20 p-4 rounded-lg border border-red-900">{err}</div> : null}

      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Report Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              {REPORT_TYPES.map((rt) => (
                <option key={rt.value} value={rt.value}>{rt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Theater</label>
            <select
              value={theaterId}
              onChange={(e) => setTheaterId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="">All Theaters</option>
              {theaters.map((t) => (
                <option key={t.id} value={t.id}>{t.name || `Theater #${t.id}`}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <button onClick={() => applyFilters()} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium">
            Apply Filters
          </button>
          <button onClick={downloadCsv} disabled={!rows.length} className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg font-medium">
            Download CSV
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Report Data</h3>
        {loading ? (
          <div className="text-gray-600">Loading report…</div>
        ) : rows.length === 0 ? (
          <div className="text-gray-600">No data found.</div>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-left border border-gray-200 rounded-lg overflow-hidden">
              <thead className="bg-gray-100 text-gray-700">
                <tr>
                  {columns.map((c) => (
                    <th key={c.key} className="px-4 py-3">{c.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <tr key={idx} className="border-t border-gray-200">
                    {columns.map((c) => {
                      const val = typeof c.accessor === 'function' ? c.accessor(row) : row[c.accessor]
                      return <td key={c.key} className="px-4 py-3">{val}</td>
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

