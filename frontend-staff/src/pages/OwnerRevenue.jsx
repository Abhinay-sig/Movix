import { useEffect, useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import PaginationControls from '../components/PaginationControls'
import { api } from '../lib/api'
import { useAuth } from '../useAuth'
import {
  downloadRevenueCsv,
  downloadRevenuePdf,
  formatCurrency,
  formatPercent,
  formatRelativeUpdateTime,
  getPresetDateRange,
  REVENUE_RANGE_OPTIONS,
  toDateInputValue,
} from '../lib/revenue'
import { formatDateTimeTo12Hour } from '../lib/time'

const PIE_COLORS = ['#2563eb', '#0f766e', '#f59e0b', '#db2777', '#7c3aed', '#059669']
const REFRESH_INTERVAL_MS = 60000
const MOVIE_PERFORMANCE_PAGE_SIZE = 10
const THEATER_BREAKDOWN_PAGE_SIZE = 5
const RECENT_BOOKINGS_PAGE_SIZE = 10

function buildPaginationState(total, page, pageSize) {
  const safePageSize = Math.max(1, Number(pageSize) || 1)
  const totalPages = Math.max(1, Math.ceil(total / safePageSize))
  const safePage = Math.min(Math.max(1, page), totalPages)

  return {
    page: safePage,
    limit: safePageSize,
    total,
    totalPages,
    hasPrevPage: safePage > 1,
    hasNextPage: safePage < totalPages,
  }
}

function formatTrendValue(value) {
  const numeric = Number(value || 0)
  return `${numeric >= 0 ? '↑' : '↓'} ${formatPercent(Math.abs(numeric))}`
}

function formatInsightText(data) {
  const insights = []

  if (data?.insights?.topPerformingMovie?.movieName) {
    insights.push({
      title: 'Top movie contribution',
      body: `${data.insights.topPerformingMovie.movieName} contributes ${formatPercent(data.insights.topMovieContributionPct || 0)} of total revenue.`,
    })
  }

  if (Number.isFinite(data?.insights?.weekendWeekdayRatio) && data.insights.weekendWeekdayRatio > 0) {
    const ratio =
      data.insights.weekendWeekdayRatio === Infinity
        ? 'significantly higher'
        : `${Number(data.insights.weekendWeekdayRatio).toFixed(1)}x higher`
    insights.push({
      title: 'Weekend vs weekday',
      body: `Weekend booking value is ${ratio} than weekdays for the selected period.`,
    })
  }

  insights.push({
    title: 'Peak booking time',
    body: `${data?.insights?.peakTime || 'No peak time yet'} currently drives the strongest booking activity.`,
  })

  if (data?.insights?.lowPerformingTheaters?.length) {
    insights.push({
      title: 'Low performing theaters',
      body: `Watch ${data.insights.lowPerformingTheaters.map((item) => item.theaterName).join(', ')} for pricing, scheduling, or marketing improvements.`,
    })
  }

  return insights
}

export default function OwnerRevenue() {
  const { auth } = useAuth()
  const [data, setData] = useState(null)
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState('last30')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [movieId, setMovieId] = useState('')
  const [theaterId, setTheaterId] = useState('')
  const [city, setCity] = useState('')
  const [showTime, setShowTime] = useState('')
  const [refreshTick, setRefreshTick] = useState(0)
  const [moviesPage, setMoviesPage] = useState(1)
  const [theatersPage, setTheatersPage] = useState(1)
  const [recentBookingsPage, setRecentBookingsPage] = useState(1)

  useEffect(() => {
    const preset = getPresetDateRange(range)
    if (range !== 'custom') {
      setStartDate(preset.startDate)
      setEndDate(preset.endDate)
    }
  }, [range])

  useEffect(() => {
    setMoviesPage(1)
    setTheatersPage(1)
    setRecentBookingsPage(1)
  }, [range, startDate, endDate, movieId, theaterId, city, showTime])

  function clearRevenueFilters() {
    const preset = getPresetDateRange('last30')
    setRange('last30')
    setStartDate(preset.startDate)
    setEndDate(preset.endDate)
    setMovieId('')
    setTheaterId('')
    setCity('')
    setShowTime('')
  }

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setRefreshTick((value) => value + 1)
    }, REFRESH_INTERVAL_MS)

    return () => window.clearInterval(intervalId)
  }, [])

  useEffect(() => {
    const today = toDateInputValue(new Date())

    if (range === 'custom' && (!startDate || !endDate)) {
      setData(null)
      setErr('')
      setLoading(false)
      return
    }

    if (startDate && startDate > today) {
      setErr('Start date cannot be in the future.')
      setData(null)
      setLoading(false)
      return
    }

    if (endDate && endDate > today) {
      setErr('End date cannot be in the future.')
      setData(null)
      setLoading(false)
      return
    }

    if (startDate && endDate && startDate > endDate) {
      setErr('Start date cannot be after end date.')
      setData(null)
      setLoading(false)
      return
    }

    let alive = true
    setLoading(true)

    const params = new URLSearchParams({ range })
    if (startDate) params.set('startDate', startDate)
    if (endDate) params.set('endDate', endDate)
    if (movieId) params.set('movieId', movieId)
    if (theaterId) params.set('theaterId', theaterId)
    if (city) params.set('city', city)
    if (showTime) params.set('showTime', showTime)

    api(`/owner/me/revenue?${params.toString()}`, { token: auth.token })
      .then((response) => {
        if (!alive) return
        setData(response)
        setErr('')
      })
      .catch((e) => {
        if (!alive) return
        setErr(e.message || 'We could not load the revenue dashboard right now.')
      })
      .finally(() => {
        if (alive) setLoading(false)
      })

    return () => {
      alive = false
    }
  }, [auth.token, range, startDate, endDate, movieId, theaterId, city, showTime, refreshTick])

  const totals = useMemo(() => {
    const grossRevenue = Number(data?.totals?.grossRevenue ?? data?.totalRevenue ?? 0)
    const platformFee = Number(data?.totals?.platformFee ?? grossRevenue * 0.05)
    const gst = Number(data?.totals?.gst ?? grossRevenue * 0.18)
    const netEarnings = Number(data?.totals?.netEarnings ?? grossRevenue - platformFee - gst)
    const averageTicketPrice = Number(data?.totals?.averageTicketPrice ?? data?.kpis?.averageTicketPrice ?? 0)
    const occupancyRate = Number(data?.totals?.occupancyRate ?? data?.kpis?.occupancyRate ?? 0)

    return {
      grossRevenue,
      platformFee,
      gst,
      netEarnings,
      averageTicketPrice,
      occupancyRate,
    }
  }, [data])

  const hasDashboardData =
    Number(data?.totalBookings || 0) > 0 ||
    Boolean(data?.charts?.revenueOverTime?.length) ||
    Boolean(data?.moviePerformance?.length) ||
    Boolean(data?.theaterBreakdown?.length)

  const moviePerformance = useMemo(() => data?.moviePerformance || [], [data])
  const moviePerformancePagination = useMemo(
    () => buildPaginationState(moviePerformance.length, moviesPage, MOVIE_PERFORMANCE_PAGE_SIZE),
    [moviePerformance.length, moviesPage]
  )
  const visibleMoviePerformance = useMemo(() => {
    const startIndex = (moviePerformancePagination.page - 1) * MOVIE_PERFORMANCE_PAGE_SIZE
    return moviePerformance.slice(startIndex, startIndex + MOVIE_PERFORMANCE_PAGE_SIZE)
  }, [moviePerformance, moviePerformancePagination.page])

  const theaterBreakdown = useMemo(() => data?.theaterBreakdown || [], [data])
  const theaterBreakdownPagination = useMemo(
    () => buildPaginationState(theaterBreakdown.length, theatersPage, THEATER_BREAKDOWN_PAGE_SIZE),
    [theaterBreakdown.length, theatersPage]
  )
  const visibleTheaterBreakdown = useMemo(() => {
    const startIndex = (theaterBreakdownPagination.page - 1) * THEATER_BREAKDOWN_PAGE_SIZE
    return theaterBreakdown.slice(startIndex, startIndex + THEATER_BREAKDOWN_PAGE_SIZE)
  }, [theaterBreakdown, theaterBreakdownPagination.page])

  const recentBookings = useMemo(() => data?.recentBookings || [], [data])
  const recentBookingsPagination = useMemo(
    () => buildPaginationState(recentBookings.length, recentBookingsPage, RECENT_BOOKINGS_PAGE_SIZE),
    [recentBookings.length, recentBookingsPage]
  )
  const visibleRecentBookings = useMemo(() => {
    const startIndex = (recentBookingsPagination.page - 1) * RECENT_BOOKINGS_PAGE_SIZE
    return recentBookings.slice(startIndex, startIndex + RECENT_BOOKINGS_PAGE_SIZE)
  }, [recentBookings, recentBookingsPagination.page])

  const insightCards = useMemo(() => formatInsightText(data), [data])

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-2">
          <h2 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            Business performance
          </h2>
          <p className="text-sm text-slate-500">
            Track revenue, occupancy, bookings, and performance trends across your venues.
          </p>
          <p className="text-xs text-slate-400">{formatRelativeUpdateTime(data?.lastUpdatedAt)}</p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => downloadRevenueCsv(data)}
            disabled={!data}
            className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-blue-600 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
          >
            Export CSV
          </button>
          <button
            type="button"
            onClick={() => downloadRevenuePdf(data)}
            disabled={!data}
            className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-700 transition-all duration-200 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Export PDF
          </button>
        </div>
      </div>

      {err ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 shadow-sm">
          <div>{err}</div>
          <button
            type="button"
            onClick={() => setRefreshTick((value) => value + 1)}
            className="mt-3 inline-flex items-center justify-center rounded-2xl border border-rose-200 bg-white px-4 py-2 text-sm font-medium text-rose-700 transition-all duration-200 hover:bg-rose-50"
          >
            Retry
          </button>
        </div>
      ) : null}

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Filters</h3>
            <p className="text-sm text-slate-500">Narrow the dashboard down to the data you want to inspect.</p>
          </div>
          <button
            type="button"
            onClick={clearRevenueFilters}
            className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-5 py-2.5 text-sm font-semibold text-slate-700 transition-all duration-200 hover:bg-slate-100"
          >
            Clear All
          </button>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Date range</label>
            <select
              value={range}
              onChange={(e) => setRange(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-all duration-200 focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            >
              {REVENUE_RANGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {range === 'custom' ? (
            <>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Start date</label>
                <input
                  type="date"
                  max={toDateInputValue(new Date())}
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-all duration-200 focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">End date</label>
                <input
                  type="date"
                  max={toDateInputValue(new Date())}
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-all duration-200 focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                />
              </div>
            </>
          ) : null}

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Movie</label>
            <select
              value={movieId}
              onChange={(e) => setMovieId(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-all duration-200 focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            >
              <option value="">All movies</option>
              {(data?.filters?.movies || []).map((movie) => (
                <option key={movie.movieId} value={movie.movieId}>
                  {movie.movieName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Theater</label>
            <select
              value={theaterId}
              onChange={(e) => setTheaterId(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-all duration-200 focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            >
              <option value="">All theaters</option>
              {(data?.filters?.theaters || []).map((theater) => (
                <option key={theater.theaterId} value={theater.theaterId}>
                  {theater.theaterName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">City</label>
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-all duration-200 focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            >
              <option value="">All cities</option>
              {(data?.filters?.cities || []).map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Show time</label>
            <select
              value={showTime}
              onChange={(e) => setShowTime(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-all duration-200 focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            >
              <option value="">All show times</option>
              {(data?.filters?.showTimes || []).map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {loading ? (
        <RevenueSkeleton />
      ) : !hasDashboardData ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center text-sm text-slate-500 shadow-sm">
          No data available for selected range
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Gross Revenue"
              value={formatCurrency(totals.grossRevenue)}
              trend={data?.comparisons?.revenueChangePct}
            />
            <MetricCard label="Platform Fee (5%)" value={formatCurrency(totals.platformFee)} />
            <MetricCard label="GST (18%)" value={formatCurrency(totals.gst)} />
            <MetricCard label="Net Earnings" value={formatCurrency(totals.netEarnings)} />
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Confirmed bookings" value={data?.totalBookings || 0} />
            <MetricCard
              label="Sold tickets"
              value={data?.soldTickets || 0}
              trend={data?.comparisons?.ticketsSoldChangePct}
            />
            <MetricCard label="Average Ticket Price" value={formatCurrency(totals.averageTicketPrice)} />
            <MetricCard label="Occupancy Rate" value={formatPercent(totals.occupancyRate)} />
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Theaters" value={data?.theaterCount || 0} />
            <MetricCard
              label="Top Performing Theater"
              value={data?.kpis?.topPerformingTheater?.theaterName || 'Not Available'}
              subvalue={
                data?.kpis?.topPerformingTheater
                  ? formatCurrency(data.kpis.topPerformingTheater.grossRevenue)
                  : ''
              }
            />
            <MetricCard
              label="Top Performing Movie"
              value={data?.kpis?.topPerformingMovie?.movieName || 'Not Available'}
              subvalue={
                data?.kpis?.topPerformingMovie
                  ? formatCurrency(data.kpis.topPerformingMovie.revenue)
                  : ''
              }
            />
            <MetricCard label="Revenue change" value={formatPercent(data?.comparisons?.revenueChangePct || 0)} />
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <ChartCard title="Revenue Over Time">
              {data?.charts?.revenueOverTime?.length ? (
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={data.charts.revenueOverTime}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="date" stroke="#64748b" />
                    <YAxis stroke="#64748b" />
                    <Tooltip
                      formatter={(value) => formatCurrency(value)}
                      labelFormatter={(value) => `Date: ${value}`}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke="#2563eb"
                      strokeWidth={3}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                    {data?.charts?.revenuePeakDay ? (
                      <ReferenceDot
                        x={data.charts.revenuePeakDay.date}
                        y={data.charts.revenuePeakDay.revenue}
                        r={6}
                        fill="#f59e0b"
                        stroke="#f59e0b"
                      />
                    ) : null}
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChartState />
              )}
            </ChartCard>

            <ChartCard title="Tickets Sold Per Day">
              {data?.charts?.ticketsSoldPerDay?.length ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={data.charts.ticketsSoldPerDay}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="date" stroke="#64748b" />
                    <YAxis stroke="#64748b" />
                    <Tooltip />
                    <Legend />
                    <ReferenceLine
                      y={data.charts.ticketsSoldPerDay[0]?.averageTickets || 0}
                      stroke="#db2777"
                      strokeDasharray="4 4"
                      label="Average"
                    />
                    <Bar dataKey="ticketsSold" fill="#0f766e" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChartState />
              )}
            </ChartCard>
          </div>

          <ChartCard title="Revenue by Movie">
            {data?.charts?.revenueByMovie?.length ? (
              <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
                <ResponsiveContainer width="100%" height={320}>
                  <PieChart>
                    <Pie
                      data={data.charts.revenueByMovie}
                      dataKey="revenue"
                      nameKey="movieName"
                      cx="50%"
                      cy="50%"
                      outerRadius={110}
                      label
                    >
                      {data.charts.revenueByMovie.map((entry, index) => (
                        <Cell key={entry.movieId} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>

                <div className="space-y-3">
                  {data.charts.revenueByMovie.map((movie, index) => (
                    <button
                      key={movie.movieId}
                      type="button"
                      onClick={() => setMovieId(String(movie.movieId))}
                      className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-left"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                        />
                        <span className="text-sm font-medium text-slate-700">{movie.movieName}</span>
                      </div>
                      <span className="text-sm text-slate-500">{formatCurrency(movie.revenue)}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <EmptyChartState />
            )}
          </ChartCard>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-slate-900">Insights</h3>
             
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {insightCards.map((item) => (
                <InsightCard key={item.title} title={item.title} body={item.body} />
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-slate-900">Movie Performance</h3>
              <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-medium text-slate-500 ring-1 ring-slate-200">
                {moviePerformance.length || 0} movies
              </span>
            </div>

            {moviePerformance.length ? (
              <div className="space-y-4">
                <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500">
                      <th className="px-3 py-3 font-medium">Movie Name</th>
                      <th className="px-3 py-3 font-medium">Tickets Sold</th>
                      <th className="px-3 py-3 font-medium">Revenue</th>
                      <th className="px-3 py-3 font-medium">Occupancy %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleMoviePerformance.map((movie) => (
                      <tr key={movie.movieId} className="border-b border-slate-100 last:border-b-0">
                        <td className="px-3 py-3 text-slate-900">
                          <button
                            type="button"
                            onClick={() => setMovieId(String(movie.movieId))}
                            className="text-left"
                          >
                            {movie.movieName}
                          </button>
                        </td>
                        <td className="px-3 py-3 text-slate-600">{movie.ticketsSold}</td>
                        <td className="px-3 py-3 text-slate-600">{formatCurrency(movie.revenue)}</td>
                        <td className="px-3 py-3 text-slate-600">{formatPercent(movie.occupancyPct)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
                <PaginationControls
                  pagination={moviePerformancePagination}
                  onPageChange={setMoviesPage}
                />
              </div>
            ) : (
              <EmptySectionState message="No movie performance data is available." />
            )}
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-slate-900">Revenue by Theater</h3>
              <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-medium text-slate-500 ring-1 ring-slate-200">
                Expand rows for show details
              </span>
            </div>

            {theaterBreakdown.length ? (
              <div className="space-y-4">
                {visibleTheaterBreakdown.map((theater) => (
                  <details
                    key={theater.theaterId}
                    className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5"
                  >
                    <summary className="cursor-pointer list-none">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault()
                              setTheaterId(String(theater.theaterId))
                            }}
                            className="text-base font-semibold text-slate-900"
                          >
                            {theater.theaterName}
                          </button>
                          <div className="text-sm text-slate-500">{theater.city}</div>
                        </div>
                        <div className="grid gap-2 text-sm text-slate-600 sm:grid-cols-3">
                          <div>{formatCurrency(theater.grossRevenue)}</div>
                          <div>Occupancy {formatPercent(theater.occupancyPct)}</div>
                          <div>Avg ticket {formatCurrency(theater.averageTicketPrice)}</div>
                        </div>
                      </div>
                    </summary>

                    <div className="mt-4 overflow-x-auto">
                      <table className="min-w-full text-left text-sm">
                        <thead>
                          <tr className="border-b border-slate-200 text-slate-500">
                            <th className="px-3 py-3 font-medium">Show</th>
                            <th className="px-3 py-3 font-medium">Time</th>
                            <th className="px-3 py-3 font-medium">Tickets</th>
                            <th className="px-3 py-3 font-medium">Revenue</th>
                            <th className="px-3 py-3 font-medium">Occupancy</th>
                          </tr>
                        </thead>
                        <tbody>
                          {theater.shows.map((show) => (
                            <tr key={show.showId} className="border-b border-slate-100 last:border-b-0">
                              <td className="px-3 py-3 text-slate-900">
                                {show.movieName} <span className="text-slate-400">•</span> {show.hallName}
                              </td>
                              <td className="px-3 py-3 text-slate-600">
                                {formatDateTimeTo12Hour(show.startsAt)}
                              </td>
                              <td className="px-3 py-3 text-slate-600">{show.ticketsSold}</td>
                              <td className="px-3 py-3 text-slate-600">{formatCurrency(show.grossRevenue)}</td>
                              <td className="px-3 py-3 text-slate-600">{formatPercent(show.occupancyPct)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </details>
                ))}
                <PaginationControls
                  pagination={theaterBreakdownPagination}
                  onPageChange={setTheatersPage}
                />
              </div>
            ) : (
              <EmptySectionState message="No theater-level revenue data is available." />
            )}
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-slate-900">Recent Bookings</h3>
              <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-medium text-slate-500 ring-1 ring-slate-200">
                {recentBookings.length} bookings
              </span>
            </div>

            {visibleRecentBookings.length ? (
              <div className="space-y-3">
                {visibleRecentBookings.map((booking) => (
                  <div
                    key={booking.bookingId}
                    className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-1">
                        <div className="font-medium text-slate-900">
                          {booking.user} <span className="text-slate-400">•</span> {booking.movie}
                        </div>
                        <div className="text-sm text-slate-500">
                          {booking.theater} • Seats: {booking.seats?.join(', ') || 'N/A'}
                        </div>
                      </div>
                      <div className="text-sm text-slate-600">
                        {formatCurrency(booking.amount)} • {formatDateTimeTo12Hour(booking.createdAt)}
                      </div>
                    </div>
                  </div>
                ))}

                <PaginationControls
                  pagination={recentBookingsPagination}
                  onPageChange={setRecentBookingsPage}
                />
              </div>
            ) : (
              <EmptySectionState message="No recent bookings are available." />
            )}
          </section>
        </div>
      )}
    </div>
  )
}

function MetricCard({ label, value, trend, subvalue }) {
  const trendValue = Number(trend)
  const isPositive = trendValue >= 0

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md sm:p-8">
      <div className="mb-2 text-sm font-medium text-slate-500">{label}</div>
      <div className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
        {value}
      </div>
      {subvalue ? <div className="mt-2 text-sm text-slate-500">{subvalue}</div> : null}
      {Number.isFinite(trendValue) ? (
        <div className={`mt-2 text-sm font-medium ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
          {formatTrendValue(trendValue)}
        </div>
      ) : null}
    </div>
  )
}

function ChartCard({ title, children }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      </div>
      {children}
    </section>
  )
}

function InsightCard({ title, body }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
      <div className="text-sm font-semibold text-slate-900">{title}</div>
      <div className="mt-2 text-sm leading-6 text-slate-500">{body}</div>
    </div>
  )
}

function EmptyChartState() {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
      No chart data is available for the selected filters.
    </div>
  )
}

function EmptySectionState({ message }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
      {message}
    </div>
  )
}

function RevenueSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-32 animate-pulse rounded-3xl border border-slate-200 bg-slate-100" />
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-32 animate-pulse rounded-3xl border border-slate-200 bg-slate-100" />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="h-96 animate-pulse rounded-3xl border border-slate-200 bg-slate-100" />
        <div className="h-96 animate-pulse rounded-3xl border border-slate-200 bg-slate-100" />
      </div>

      <div className="h-96 animate-pulse rounded-3xl border border-slate-200 bg-slate-100" />
      <div className="h-80 animate-pulse rounded-3xl border border-slate-200 bg-slate-100" />
    </div>
  )
}
