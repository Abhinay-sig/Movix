import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../AuthContext'

export default function OwnerRevenue() {
  const { auth } = useAuth()
  const [data, setData] = useState(null)
  const [err, setErr] = useState('')

  useEffect(() => {
    api('/owner/me/revenue', { token: auth.token })
      .then(setData)
      .catch((e) => setErr(e.message))
  }, [auth.token])

  return (
    <div>
      <h2 className="text-4xl font-bold text-white mb-8">Revenue</h2>
      {err ? <div className="text-red-400 bg-red-900/20 p-4 rounded-lg border border-red-900 mb-6">{err}</div> : null}
      {!data ? (
        <div className="text-gray-300 text-lg">Loading…</div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <MetricCard label="Total revenue" value={`₹${Number(data.totalRevenue).toFixed(2)}`} />
            <MetricCard label="Confirmed bookings" value={data.totalBookings} />
            <MetricCard label="Sold tickets" value={data.soldTickets} />
            <MetricCard label="Theaters" value={data.theaterCount} />
          </div>

          <div className="bg-white rounded-xl shadow-lg p-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">Revenue by theater</h3>
            {data.breakdown.length === 0 ? (
              <div className="text-gray-500">No ticket sales yet.</div>
            ) : (
              <div className="space-y-4">
                {data.breakdown.map((item) => (
                  <div key={item.theaterId} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                      <div>
                        <div className="font-bold text-gray-900">{item.theaterName}</div>
                        <div className="text-sm text-gray-500">{item.city}</div>
                      </div>
                      <div className="text-sm text-gray-700">
                        {item.bookingCount} booking{item.bookingCount === 1 ? '' : 's'} • ₹
                        {Number(item.totalRevenue).toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-lg p-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">Recent confirmed bookings</h3>
            {data.recentBookings.length === 0 ? (
              <div className="text-gray-500">No confirmed bookings yet.</div>
            ) : (
              <div className="space-y-3">
                {data.recentBookings.map((booking) => (
                  <div key={booking.bookingId} className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 border-b border-gray-100 pb-3 last:border-b-0 last:pb-0">
                    <div>
                      <div className="font-medium text-gray-900">{booking.theaterName}</div>
                      <div className="text-sm text-gray-500">
                        Booking #{booking.bookingId} • Show #{booking.showId}
                      </div>
                    </div>
                    <div className="text-sm text-gray-700">
                      ₹{Number(booking.totalAmount).toFixed(2)} • {new Date(booking.createdAt).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function MetricCard({ label, value }) {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="text-gray-600 text-sm font-medium mb-2">{label}</div>
      <div className="text-3xl font-bold text-blue-600">{value}</div>
    </div>
  )
}
