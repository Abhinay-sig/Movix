import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../AuthContext'

function msLeft(expiresAt) {
  const t = new Date(expiresAt).getTime()
  return Math.max(0, t - Date.now())
}

export default function Payment() {
  const { auth } = useAuth()
  const { showId } = useParams()
  const loc = useLocation()
  const nav = useNavigate()
  const seatCodes = loc.state?.seatCodes || []
  const expiresAt = loc.state?.expiresAt

  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(null)
  const [tick, setTick] = useState(0)

  const left = useMemo(() => (expiresAt ? msLeft(expiresAt) : 0), [expiresAt, tick])

  useEffect(() => {
    if (!expiresAt) return
    const id = setInterval(() => setTick((t) => t + 1), 1000)
    return () => clearInterval(id)
  }, [expiresAt])

  useEffect(() => {
    if (!seatCodes.length) return
    api(`/public/shows/${showId}/estimate`, { method: 'POST', body: { seatCodes } })
      .then((d) => setTotal(d.total))
      .catch(() => setTotal(null))
  }, [showId, seatCodes])

  useEffect(() => {
    if (expiresAt && left === 0) {
      alert('Seat hold expired. Redirecting to home.')
      nav('/', { replace: true })
    }
  }, [expiresAt, left, nav])

  if (!seatCodes.length || !expiresAt) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-white rounded-xl shadow-xl p-8">
          <div className="text-red-600 font-semibold mb-6">Missing seat selection.</div>
          <Link to="/" className="text-blue-600 hover:text-blue-700 font-medium">Go home</Link>
        </div>
      </div>
    )
  }

  async function confirm() {
    setErr('')
    setLoading(true)
    try {
      const data = await api('/bookings/confirm', {
        method: 'POST',
        token: auth.token,
        body: { showId: Number(showId), seatCodes },
      })
      alert(`Booked! Booking #${data.bookingId}`)
      nav('/', { replace: true })
    } catch (e) {
      setErr(e.message)
    } finally {
      setLoading(false)
    }
  }

  const secs = Math.ceil(left / 1000)

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-4xl font-bold text-white mb-8">Complete your booking</h2>
      <div className="bg-white rounded-xl shadow-lg p-8 space-y-6">
        <div className="flex items-baseline justify-between pb-6 border-b border-gray-200">
          <div>
            <div className="text-sm text-gray-500 mb-1">Hold expires in</div>
            <div className="text-3xl font-bold text-red-600">{secs}s</div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500 mb-1">Total amount</div>
            <div className="text-3xl font-bold text-green-600">{total === null ? '—' : `₹${total}`}</div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <div className="text-sm text-gray-500 mb-2">Selected seats</div>
            <div className="font-mono text-lg font-medium text-gray-900 bg-gray-50 p-4 rounded-lg border border-gray-300">
              {seatCodes.join(', ')}
            </div>
          </div>
        </div>

        {err ? <div className="text-red-600 text-sm bg-red-50 p-4 rounded-lg border border-red-300">{err}</div> : null}

        <button disabled={loading} onClick={confirm} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-50">
          {loading ? 'Confirming…' : 'Confirm booking'}
        </button>

        <div className="text-center">
          <Link to="/" className="text-blue-600 hover:text-blue-700 font-medium">Cancel and go home</Link>
        </div>
      </div>
    </div>
  )
}

