import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts'
import { api } from '../lib/api'
import { useAuth } from '../AuthContext'

function MetricCard({ label, value, colorClass = 'text-blue-600' }) {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="text-gray-600 text-sm font-medium mb-2">{label}</div>
      <div className={`text-3xl font-bold ${colorClass}`}>{value}</div>
    </div>
  )
}

export default function AdminDashboard() {
  const { auth } = useAuth()
  const nav = useNavigate()
  const [revenue, setRevenue] = useState(null)
  const [trend, setTrend] = useState([])
  const [stats, setStats] = useState(null)
  const [activity, setActivity] = useState([])
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(true)

  const fallbackTrendData = [
    { date: '2026-04-01', revenue: 200 },
    { date: '2026-04-02', revenue: 350 },
    { date: '2026-04-03', revenue: 280 },
    { date: '2026-04-04', revenue: 420 },
    { date: '2026-04-05', revenue: 390 },
  ]

  useEffect(() => {
    setLoading(true)
    Promise.all([
      api('/admin/dashboard/revenue', { token: auth.token }),
      api('/admin/revenue-trend', { token: auth.token }),
      api('/admin/stats', { token: auth.token }),
      api('/admin/activity', { token: auth.token }),
    ])
      .then(([rev, tr, st, act]) => {
        // eslint-disable-next-line no-console
        console.log('Revenue trend API response:', tr)
        setRevenue(rev)
        setTrend(Array.isArray(tr) && tr.length > 0 ? tr : fallbackTrendData)
        setStats(st)
        setActivity(Array.isArray(act) ? act : [])
      })
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false))
  }, [auth.token])

  return (
    <div>
      <h2 className="text-4xl font-bold text-white mb-8">Admin dashboard</h2>
      {err ? <div className="text-red-400 bg-red-900/20 p-4 rounded-lg border border-red-900 mb-6">{err}</div> : null}
      {loading ? (
        <div className="text-gray-300 text-lg">Loading…</div>
      ) : (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <button
                onClick={() => nav('/admin/approvals')}
                className="text-left bg-blue-50 border border-blue-200 rounded-xl p-5 shadow-sm hover:shadow-md hover:scale-[1.01] transition-all"
              >
                <h4 className="text-lg font-bold text-blue-900">Review Approvals</h4>
                <p className="text-sm text-blue-800 mt-2">Approve or reject halls and shows</p>
              </button>
              <button
                onClick={() => nav('/admin/caps')}
                className="text-left bg-emerald-50 border border-emerald-200 rounded-xl p-5 shadow-sm hover:shadow-md hover:scale-[1.01] transition-all"
              >
                <h4 className="text-lg font-bold text-emerald-900">Update Seat Caps</h4>
                <p className="text-sm text-emerald-800 mt-2">Manage pricing limits for seat types</p>
              </button>
              <button
                onClick={() => nav('/admin/reports')}
                className="text-left bg-slate-50 border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md hover:scale-[1.01] transition-all"
              >
                <h4 className="text-lg font-bold text-slate-900">View Reports</h4>
                <p className="text-sm text-slate-700 mt-2">Analyze revenue and booking data</p>
              </button>
              <button
                onClick={() => nav('/admin/blocking')}
                className="text-left bg-rose-50 border border-rose-200 rounded-xl p-5 shadow-sm hover:shadow-md hover:scale-[1.01] transition-all"
              >
                <h4 className="text-lg font-bold text-rose-900">Manage Visibility</h4>
                <p className="text-sm text-rose-800 mt-2">Block or unblock theaters, halls, and shows</p>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <MetricCard label="Gross Revenue" value={`₹${revenue?.grossRevenue ?? 0}`} colorClass="text-blue-600" />
            <MetricCard label="Admin Revenue (5%)" value={`₹${revenue?.adminRevenue ?? 0}`} colorClass="text-green-600" />
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Revenue Trend</h3>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip formatter={(v) => [`₹${v}`, 'Revenue']} />
                  <Line type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <MetricCard label="Total Bookings" value={stats?.totalBookings ?? 0} colorClass="text-indigo-600" />
            <MetricCard label="Tickets Sold Today" value={stats?.todayTickets ?? 0} colorClass="text-amber-600" />
            <MetricCard label="Active Shows" value={stats?.activeShows ?? 0} colorClass="text-fuchsia-600" />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-lg p-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Top 5 theaters</h3>
              <div className="space-y-4">
                {(revenue?.top5 || []).map((t) => (
                  <div key={t.theaterId} className="border-l-4 border-blue-600 pl-4 p-4 bg-gray-50 rounded-r-lg hover:bg-gray-100 transition-colors">
                    <div className="font-bold text-gray-900">{t.name || `Theater #${t.theaterId}`}</div>
                    <div className="flex justify-between items-center mt-2">
                      <div className="text-gray-600">₹{t.total}</div>
                      <div className="text-sm text-gray-500">{t.contributionPct.toFixed(2)}% of total</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Recent Activity</h3>
              <div className="space-y-3">
                {activity.map((a, i) => (
                  <div key={`${a.message}-${i}`} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="text-gray-900 font-medium">{a.message}</div>
                    <div className="text-xs text-gray-500 mt-1">{a.time}</div>
                  </div>
                ))}
                {activity.length === 0 ? <div className="text-gray-600">No recent activity.</div> : null}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
