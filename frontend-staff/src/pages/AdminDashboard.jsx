import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../useAuth'

export default function AdminDashboard() {
  const { auth } = useAuth()
  const [data, setData] = useState(null)
  const [err, setErr] = useState('')

  useEffect(() => {
    api('/admin/dashboard/revenue', { token: auth.token })
      .then((response) => {
        setData(response)
        setErr('')
      })
      .catch((e) => setErr(e.message))
  }, [auth.token])

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
          Platform overview
        </h2>
        <p className="text-sm text-slate-500">
          Track platform performance and spotlight top-performing venues.
        </p>
      </div>

      {err ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 shadow-sm">
          {err}
        </div>
      ) : null}

      {!data ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-8 text-sm text-slate-500 shadow-sm">
          Loading…
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md sm:p-8">
              <div className="mb-2 text-sm font-medium text-slate-500">
                Gross revenue
              </div>
              <div className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                ₹{data.grossRevenue}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md sm:p-8">
              <div className="mb-2 text-sm font-medium text-slate-500">
                Platform share
              </div>
              <div className="text-3xl font-semibold tracking-tight text-emerald-600 sm:text-4xl">
                ₹{data.adminRevenue}
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
            <div className="mb-6 flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-slate-900 sm:text-xl">
                Top venues
              </h3>
              <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-medium text-slate-500 ring-1 ring-slate-200">
                Highest performing venues
              </span>
            </div>

            <div className="space-y-3">
              {data.top5.map((theater, index) => (
                <div
                  key={theater.theaterId}
                  className="group rounded-2xl border border-slate-200 bg-slate-50/70 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:bg-white hover:shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">
                        #{index + 1}
                      </div>
                      <div className="truncate text-base font-semibold text-slate-900">
                        {theater.name || `Theater #${theater.theaterId}`}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-base font-semibold text-slate-900">
                        ₹{theater.total}
                      </div>
                      <div className="text-xs text-slate-500">
                        {theater.contributionPct.toFixed(2)}% of total
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-300 group-hover:opacity-90"
                      style={{ width: `${Math.min(theater.contributionPct, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
