import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import { api } from '../lib/api'
import { useAuth } from '../useAuth'

const PIE_COLORS = ['#2563eb', '#0ea5e9', '#14b8a6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6']

function MetricCard({ label, value, colorClass = 'text-blue-600' }) {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="text-gray-600 text-sm font-medium mb-2">{label}</div>
      <div className={`text-3xl font-bold ${colorClass}`}>{value}</div>
    </div>
  )
}

function formatMoney(value) {
  return `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
}

function toYmd(date) {
  const d = new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function buildByTheaterPath(filters) {
  const params = new URLSearchParams()
  if (filters.fromDate) params.set('fromDate', filters.fromDate)
  if (filters.toDate) params.set('toDate', filters.toDate)
  if (filters.theaterId) params.set('theaterId', filters.theaterId)
  if (filters.movieId) params.set('movieId', filters.movieId)
  const query = params.toString()
  return `/admin/revenue/by-theater${query ? `?${query}` : ''}`
}

function buildTrendPath(days) {
  return `/admin/revenue-trend?days=${days}`
}

function getActivityIndicator(message = '') {
  const lower = String(message).toLowerCase()
  if (lower.includes('approved')) return { label: 'A', className: 'bg-emerald-100 text-emerald-700' }
  if (lower.includes('reject')) return { label: 'R', className: 'bg-rose-100 text-rose-700' }
  if (lower.includes('updated') || lower.includes('cap')) return { label: 'U', className: 'bg-blue-100 text-blue-700' }
  if (lower.includes('cancel')) return { label: 'C', className: 'bg-amber-100 text-amber-700' }
  return { label: 'I', className: 'bg-slate-100 text-slate-700' }
}

export default function AdminDashboard() {
  const { auth } = useAuth()
  const nav = useNavigate()
  const [revenue, setRevenue] = useState(null)
  const [trend, setTrend] = useState([])
  const [trendDays, setTrendDays] = useState(30)
  const [stats, setStats] = useState(null)
  const [systemHealth, setSystemHealth] = useState(null)
  const [activity, setActivity] = useState([])
  const [theaterRows, setTheaterRows] = useState([])
  const [theaters, setTheaters] = useState([])
  const [movies, setMovies] = useState([])
  const [filters, setFilters] = useState({
    fromDate: '',
    toDate: '',
    theaterId: '',
    movieId: '',
  })
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(true)
  const [trendLoading, setTrendLoading] = useState(false)
  const [theaterRevenueLoading, setTheaterRevenueLoading] = useState(false)

  const fallbackTrendData = [
    { date: '2026-04-01', revenue: 200, bookings: 1 },
    { date: '2026-04-02', revenue: 350, bookings: 2 },
    { date: '2026-04-03', revenue: 280, bookings: 2 },
    { date: '2026-04-04', revenue: 420, bookings: 3 },
    { date: '2026-04-05', revenue: 390, bookings: 2 },
  ]

  function normalizeByTheaterRows(rows) {
    return Array.isArray(rows)
      ? rows.map((row) => ({
          theaterId: row.theaterId,
          theaterName: row.theaterName || 'Unknown Theater',
          totalRevenue: Number(row.totalRevenue) || 0,
          totalBookings: Number(row.totalBookings) || 0,
          ticketsSold: Number(row.ticketsSold) || 0,
          occupancyPct: Number(row.occupancyPct) || 0,
          avgTicketPrice: Number(row.avgTicketPrice) || 0,
        }))
      : []
  }

  async function loadTrend(days) {
    setTrendLoading(true)
    try {
      const tr = await api(buildTrendPath(days), { token: auth.token })
      const normalizedTrend = Array.isArray(tr)
        ? tr
            .map((point) => ({
              date: String(point?.date || ''),
              revenue: Number(point?.revenue) || 0,
              bookings: Number(point?.bookings) || 0,
            }))
            .filter((point) => point.date)
        : []
      setTrend(normalizedTrend.length ? normalizedTrend : fallbackTrendData)
    } catch (e) {
      setErr(e.message)
      setTrend(fallbackTrendData)
    } finally {
      setTrendLoading(false)
    }
  }

  async function loadByTheater(activeFilters) {
    setTheaterRevenueLoading(true)
    try {
      const payload = await api(buildByTheaterPath(activeFilters), { token: auth.token })
      setTheaterRows(normalizeByTheaterRows(payload?.rows))
    } catch (e) {
      setErr(e.message)
      setTheaterRows([])
    } finally {
      setTheaterRevenueLoading(false)
    }
  }

  function setQuickRange(days) {
    const toDate = toYmd(new Date())
    const from = new Date()
    from.setDate(from.getDate() - (days - 1))
    const next = { ...filters, fromDate: toYmd(from), toDate }
    setFilters(next)
    loadByTheater(next)
  }

  useEffect(() => {
    let active = true
    setLoading(true)

    Promise.all([
      api('/admin/dashboard/revenue', { token: auth.token }),
      api('/admin/stats', { token: auth.token }),
      api('/admin/system-health', { token: auth.token }),
      api('/admin/activity', { token: auth.token }),
      api('/admin/theaters/contribution', { token: auth.token }),
      api('/admin/movies', { token: auth.token }),
      api(buildByTheaterPath(filters), { token: auth.token }),
    ])
      .then(([rev, st, health, act, theaterPayload, moviesPayload, byTheater]) => {
        if (!active) return
        const safeRevenue = {
          ...rev,
          grossRevenue: Number(rev?.grossRevenue) || 0,
          adminRevenue: Number(rev?.adminRevenue) || 0,
          revenueChangePct: Number(rev?.revenueChangePct) || 0,
          bookingRevenue: Number(rev?.bookingRevenue) || 0,
          membership: {
            totalRevenue: Number(rev?.membership?.totalRevenue) || 0,
            totalPurchases: Number(rev?.membership?.totalPurchases) || 0,
          },
          coins: {
            cashbackCoins: Number(rev?.coins?.cashbackCoins) || 0,
            redeemedCoins: Number(rev?.coins?.redeemedCoins) || 0,
            walletCoinsBalance: Number(rev?.coins?.walletCoinsBalance) || 0,
            netCoinsIssued: Number(rev?.coins?.netCoinsIssued) || 0,
          },
        }

        setRevenue(safeRevenue)
        setStats({
          ...st,
          totalBookings: Number(st?.totalBookings) || 0,
          todayTickets: Number(st?.todayTickets) || 0,
          activeShows: Number(st?.activeShows) || 0,
          bookingsChangePct: Number(st?.bookingsChangePct) || 0,
        })
        setSystemHealth({
          activeShows: Number(health?.activeShows) || 0,
          pendingApprovals: Number(health?.pendingApprovals) || 0,
          blockedTheaters: Number(health?.blockedTheaters) || 0,
        })
        setActivity(Array.isArray(act) ? act : [])
        setTheaters(Array.isArray(theaterPayload?.theaters) ? theaterPayload.theaters : [])
        setMovies(Array.isArray(moviesPayload?.movies) ? moviesPayload.movies : [])
        setTheaterRows(normalizeByTheaterRows(byTheater?.rows))
      })
      .catch((e) => {
        if (!active) return
        setErr(e.message)
      })
      .finally(() => {
        if (!active) return
        setLoading(false)
      })

    return () => {
      active = false
    }
  }, [auth.token])

  useEffect(() => {
    loadTrend(trendDays)
  }, [auth.token, trendDays])

  const totalRevenueByTheater = useMemo(() => theaterRows.reduce((sum, row) => sum + row.totalRevenue, 0), [theaterRows])
  const pieData = useMemo(
    () =>
      theaterRows
        .filter((row) => row.totalRevenue > 0)
        .map((row) => ({
          name: row.theaterName,
          value: row.totalRevenue,
          percentage: totalRevenueByTheater > 0 ? (row.totalRevenue / totalRevenueByTheater) * 100 : 0,
        })),
    [theaterRows, totalRevenueByTheater]
  )
  const topPerformer = theaterRows[0] || null
  const lowPerformers = useMemo(
    () => [...theaterRows].sort((a, b) => a.totalRevenue - b.totalRevenue).slice(0, 3),
    [theaterRows]
  )
  const activeFilterBadges = useMemo(() => {
    const tags = []
    if (filters.fromDate) tags.push(`From: ${filters.fromDate}`)
    if (filters.toDate) tags.push(`To: ${filters.toDate}`)
    if (filters.theaterId) {
      const theater = theaters.find((t) => String(t.theaterId || t.id) === String(filters.theaterId))
      tags.push(`Theater: ${theater?.name || filters.theaterId}`)
    }
    if (filters.movieId) {
      const movie = movies.find((m) => String(m.id) === String(filters.movieId))
      tags.push(`Movie: ${movie?.title || filters.movieId}`)
    }
    return tags
  }, [filters, theaters, movies])

  return (
    <div>
      <h2 className="text-4xl font-bold text-black mb-8">Admin dashboard</h2>
      {err ? <div className="text-red-400 bg-red-900/20 p-4 rounded-lg border border-red-900 mb-6">{err}</div> : null}
      {loading ? (
        <div className="text-gray-300 text-lg">Loading…</div>
      ) : (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-black mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <button onClick={() => nav('/admin/approvals')} className="text-left bg-blue-50 border border-blue-200 rounded-xl p-5 shadow-sm hover:shadow-md hover:scale-[1.01] transition-all">
                <h4 className="text-lg font-bold text-blue-900">Review Approvals</h4>
                <p className="text-sm text-blue-800 mt-2">Approve or reject halls and shows</p>
              </button>
              <button onClick={() => nav('/admin/caps')} className="text-left bg-emerald-50 border border-emerald-200 rounded-xl p-5 shadow-sm hover:shadow-md hover:scale-[1.01] transition-all">
                <h4 className="text-lg font-bold text-emerald-900">Update Seat Caps</h4>
                <p className="text-sm text-emerald-800 mt-2">Manage pricing limits for seat types</p>
              </button>
              <button onClick={() => nav('/admin/multiplexes')} className="text-left bg-slate-50 border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md hover:scale-[1.01] transition-all">
                <h4 className="text-lg font-bold text-slate-900">View Muliplexes</h4>
                <p className="text-sm text-slate-700 mt-2">Manage and view all multiplexes</p>
              </button>
              <button onClick={() => nav('/admin/blocking')} className="text-left bg-rose-50 border border-rose-200 rounded-xl p-5 shadow-sm hover:shadow-md hover:scale-[1.01] transition-all">
                <h4 className="text-lg font-bold text-rose-900">Manage Visibility</h4>
                <p className="text-sm text-rose-800 mt-2">Block or unblock theaters, halls, and shows</p>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-black mb-4">Revenue Insights Filters</h3>
            <div className="flex flex-wrap gap-2 mb-4">
              <button type="button" onClick={() => setQuickRange(1)} className="px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-sm font-medium text-slate-700">Today</button>
              <button type="button" onClick={() => setQuickRange(7)} className="px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-sm font-medium text-slate-700">Last 7 Days</button>
              <button type="button" onClick={() => setQuickRange(30)} className="px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-sm font-medium text-slate-700">Last 30 Days</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
              <div>
                <label className="text-sm text-slate-600 block mb-1">From Date</label>
                <input type="date" value={filters.fromDate} onChange={(e) => setFilters((prev) => ({ ...prev, fromDate: e.target.value }))} className="w-full h-11 px-3 border border-gray-300 rounded-lg" />
              </div>
              <div>
                <label className="text-sm text-slate-600 block mb-1">To Date</label>
                <input type="date" value={filters.toDate} onChange={(e) => setFilters((prev) => ({ ...prev, toDate: e.target.value }))} className="w-full h-11 px-3 border border-gray-300 rounded-lg" />
              </div>
              <div>
                <label className="text-sm text-slate-600 block mb-1">Theater</label>
                <select value={filters.theaterId} onChange={(e) => setFilters((prev) => ({ ...prev, theaterId: e.target.value }))} className="w-full h-11 px-3 border border-gray-300 rounded-lg bg-white">
                  <option value="">All Theaters</option>
                  {theaters.map((theater) => (
                    <option key={theater.theaterId || theater.id} value={theater.theaterId || theater.id}>{theater.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-slate-600 block mb-1">Movie</label>
                <select value={filters.movieId} onChange={(e) => setFilters((prev) => ({ ...prev, movieId: e.target.value }))} className="w-full h-11 px-3 border border-gray-300 rounded-lg bg-white">
                  <option value="">All Movies</option>
                  {movies.map((movie) => (
                    <option key={movie.id} value={movie.id}>{movie.title}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end gap-2">
                <button type="button" onClick={() => loadByTheater(filters)} disabled={theaterRevenueLoading} className="h-11 px-5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50">
                  {theaterRevenueLoading ? 'Applying…' : 'Apply Filters'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const reset = { fromDate: '', toDate: '', theaterId: '', movieId: '' }
                    setFilters(reset)
                    loadByTheater(reset)
                  }}
                  disabled={theaterRevenueLoading}
                  className="h-11 px-5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-medium border border-slate-300 disabled:opacity-50"
                >
                  Reset
                </button>
              </div>
            </div>
            {activeFilterBadges.length ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {activeFilterBadges.map((tag) => (
                  <span key={tag} className="px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-medium">{tag}</span>
                ))}
              </div>
            ) : null}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <MetricCard label="Gross Revenue" value={formatMoney(revenue?.grossRevenue)} colorClass="text-blue-600" />
            <MetricCard label="Admin Revenue (20%)" value={formatMoney(revenue?.adminRevenue)} colorClass="text-green-600" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            <MetricCard label="Booking Revenue" value={formatMoney(revenue?.bookingRevenue)} colorClass="text-sky-600" />
            <MetricCard label="Membership Revenue" value={formatMoney(revenue?.membership?.totalRevenue)} colorClass="text-indigo-600" />
            <MetricCard label="Membership Purchases" value={revenue?.membership?.totalPurchases ?? 0} colorClass="text-violet-600" />
            <MetricCard label="Wallet Coins In Circulation" value={Number(revenue?.coins?.walletCoinsBalance || 0).toLocaleString('en-IN')} colorClass="text-amber-600" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <MetricCard label="Cashback Coins Issued" value={Number(revenue?.coins?.cashbackCoins || 0).toLocaleString('en-IN')} colorClass="text-emerald-600" />
            <MetricCard label="Coins Redeemed" value={Number(revenue?.coins?.redeemedCoins || 0).toLocaleString('en-IN')} colorClass="text-rose-600" />
            <MetricCard label="Net Coins Issued" value={Number(revenue?.coins?.netCoinsIssued || 0).toLocaleString('en-IN')} colorClass="text-teal-600" />
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-black">Revenue Trend</h3>
              <div className="inline-flex rounded-lg border border-slate-200 p-1 bg-slate-50">
                <button type="button" onClick={() => setTrendDays(7)} className={`px-3 py-1.5 rounded-md text-sm font-medium ${trendDays === 7 ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-200'}`}>7 Days</button>
                <button type="button" onClick={() => setTrendDays(30)} className={`px-3 py-1.5 rounded-md text-sm font-medium ${trendDays === 30 ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-200'}`}>30 Days</button>
              </div>
            </div>
            <div style={{ width: '100%', height: 300 }} className="min-h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip
                    formatter={(v, key) => [key === 'revenue' ? formatMoney(v) : v, key === 'revenue' ? 'Revenue' : 'Bookings']}
                    labelFormatter={(label) => `Date: ${label}`}
                  />
                  <Line type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            {trendLoading ? <div className="text-sm text-slate-500 mt-2">Refreshing trend data…</div> : null}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <MetricCard label="Total Bookings" value={stats?.totalBookings ?? 0} colorClass="text-indigo-600" />
            <MetricCard label="Tickets Sold Today" value={stats?.todayTickets ?? 0} colorClass="text-amber-600" />
            <MetricCard label="Active Shows" value={stats?.activeShows ?? 0} colorClass="text-fuchsia-600" />
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-black mb-4">System Health</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs uppercase tracking-wide text-slate-500">Active Shows</div>
                <div className="text-2xl font-bold text-slate-900 mt-1">{systemHealth?.activeShows ?? 0}</div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs uppercase tracking-wide text-slate-500">Pending Approvals</div>
                <div className="text-2xl font-bold text-slate-900 mt-1">{systemHealth?.pendingApprovals ?? 0}</div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs uppercase tracking-wide text-slate-500">Blocked Theaters</div>
                <div className="text-2xl font-bold text-slate-900 mt-1">{systemHealth?.blockedTheaters ?? 0}</div>
              </div>
            </div>
            {!Number(systemHealth?.activeShows) ? (
              <div className="mt-4 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
                No active shows right now. Review pending approvals or schedule new shows.
              </div>
            ) : null}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl shadow-lg p-6 xl:col-span-2">
              <h3 className="text-xl font-bold text-black mb-4">Revenue by Theater</h3>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-sm">
                  <thead className="bg-gray-100 text-gray-700">
                    <tr>
                      <th className="text-left py-3 px-3 font-semibold">Theater Name</th>
                      <th className="text-right py-3 px-3 font-semibold">Revenue</th>
                      <th className="text-right py-3 px-3 font-semibold">Bookings</th>
                      <th className="text-right py-3 px-3 font-semibold">Tickets Sold</th>
                      <th className="text-right py-3 px-3 font-semibold">Occupancy %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {theaterRows.map((row) => (
                      <tr
                        key={row.theaterId}
                        className="border-b border-gray-100 hover:bg-blue-50/50 cursor-pointer"
                        onClick={() => {
                          const next = { ...filters, theaterId: String(row.theaterId) }
                          setFilters(next)
                          loadByTheater(next)
                        }}
                      >
                        <td className="py-3 px-3 font-medium text-slate-900">{row.theaterName}</td>
                        <td className="py-3 px-3 text-right font-semibold text-blue-700">{formatMoney(row.totalRevenue)}</td>
                        <td className="py-3 px-3 text-right text-slate-700">{row.totalBookings}</td>
                        <td className="py-3 px-3 text-right text-slate-700">{row.ticketsSold}</td>
                        <td className="py-3 px-3 text-right text-slate-700">{row.occupancyPct.toFixed(2)}%</td>
                      </tr>
                    ))}
                    {!theaterRows.length ? (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-slate-500">
                          {theaterRevenueLoading ? 'Loading theater revenue…' : 'No theater revenue found for selected filters.'}
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
              <div className="mt-2 text-xs text-slate-500">Tip: Click a row to drill down by that theater.</div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-bold text-black mb-3">Top Performer</h3>
              {topPerformer ? (
                <div className="space-y-2 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                  <div className="text-lg font-bold text-emerald-900">{topPerformer.theaterName}</div>
                  <div className="text-sm text-emerald-800">Revenue: {formatMoney(topPerformer.totalRevenue)}</div>
                  <div className="text-sm text-emerald-800">Bookings: {topPerformer.totalBookings}</div>
                  <div className="text-sm text-emerald-800">Tickets Sold: {topPerformer.ticketsSold}</div>
                  <div className="text-sm text-emerald-800">Occupancy: {topPerformer.occupancyPct.toFixed(2)}%</div>
                  <div className="text-sm text-emerald-800">Avg Ticket Price: {formatMoney(topPerformer.avgTicketPrice)}</div>
                </div>
              ) : (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                  No top performer yet for current filters.
                </div>
              )}
              <h3 className="text-xl font-bold text-black mt-6 mb-3">Revenue Distribution</h3>
              <div style={{ width: '100%', height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      outerRadius={90}
                      label={(entry) => `${entry.percentage.toFixed(1)}%`}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`${entry.name}-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => [formatMoney(v), 'Revenue']} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-bold text-black mb-4">Low Performing Theaters</h3>
              <div className="space-y-3">
                {lowPerformers.length ? (
                  lowPerformers.map((row) => (
                    <div key={row.theaterId} className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                      <div className="font-semibold text-amber-900">{row.theaterName}</div>
                      <div className="text-sm text-amber-800">Revenue: {formatMoney(row.totalRevenue)}</div>
                      <div className="text-sm text-amber-800">Occupancy: {row.occupancyPct.toFixed(2)}%</div>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-slate-600">No low performer data available.</div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-8 xl:col-span-2">
              <h3 className="text-2xl font-bold text-black mb-6">Recent Activity</h3>
              <div className="space-y-3">
                {activity.map((a, i) => {
                  const indicator = getActivityIndicator(a.message)
                  return (
                    <div key={`${a.message}-${i}`} className="p-3 bg-gray-50 rounded-lg border border-gray-200 flex items-start gap-3">
                      <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${indicator.className}`}>{indicator.label}</span>
                      <div>
                        <div className="text-gray-900 font-medium">{a.message}</div>
                        <div className="text-xs text-gray-500 mt-1">{a.time}</div>
                      </div>
                    </div>
                  )
                })}
                {activity.length === 0 ? <div className="text-gray-600">No recent activity.</div> : null}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
