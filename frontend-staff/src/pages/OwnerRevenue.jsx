import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../useAuth'

export default function OwnerRevenue() {
  const { auth } = useAuth()
  const [data, setData] = useState(null)
  const [err, setErr] = useState('')

  useEffect(() => {
    api('/owner/me/revenue', { token: auth.token })
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
          Business performance
        </h2>
        <p className="text-sm text-slate-500">
          A quick look at how your venues and bookings are performing.
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
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Total earnings" value={`₹${Number(data.totalRevenue).toFixed(2)}`} />
            <MetricCard label="Confirmed bookings" value={data.totalBookings} />
            <MetricCard label="Sold tickets" value={data.soldTickets} />
            <MetricCard label="Theaters" value={data.theaterCount} />
          </div>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-slate-900">
                Revenue by theater
              </h3>
              <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-medium text-slate-500 ring-1 ring-slate-200">
                {data.breakdown.length} venues
              </span>
            </div>

            {data.breakdown.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
                No ticket sales yet.
              </div>
            ) : (
              <div className="space-y-4">
                {data.breakdown.map((item) => (
                  <div
                    key={item.theaterId}
                    className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="text-base font-semibold text-slate-900">
                          {item.theaterName}
                        </div>
                        <div className="text-sm text-slate-500">{item.city}</div>
                      </div>
                      <div className="text-sm text-slate-600">
                        {item.bookingCount} booking{item.bookingCount === 1 ? '' : 's'} • ₹
                        {Number(item.totalRevenue).toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-slate-900">
                Recent confirmed bookings
              </h3>
              <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-medium text-slate-500 ring-1 ring-slate-200">
                Last {data.recentBookings.length}
              </span>
            </div>

            {data.recentBookings.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
                No confirmed bookings yet.
              </div>
            ) : (
              <div className="space-y-3">
                {data.recentBookings.map((booking) => (
                  <div
                    key={booking.bookingId}
                    className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <div className="font-medium text-slate-900">
                        {booking.theaterName}
                      </div>
                      <div className="text-sm text-slate-500">
                        Booking #{booking.bookingId} • Show #{booking.showId}
                      </div>
                    </div>
                    <div className="text-sm text-slate-600">
                      ₹{Number(booking.totalAmount).toFixed(2)} •{' '}
                      {new Date(booking.createdAt).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  )
}

function MetricCard({ label, value }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md sm:p-8">
      <div className="mb-2 text-sm font-medium text-slate-500">{label}</div>
      <div className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
        {value}
      </div>
    </div>
  )
}
