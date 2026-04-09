import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { api } from '../lib/api'
import { downloadTicketPdf, isUpcomingTicket } from '../lib/ticketPdf'
import { useAuth } from '../useAuth'

const PAYMENT_METHODS = [
  {
    code: 'upi',
    label: 'UPI',
    helper: 'Pay via UPI ID or supported apps',
    accent: 'from-blue-600 via-sky-500 to-cyan-400',
  },
  {
    code: 'card',
    label: 'Cards',
    helper: 'Visa, Mastercard, RuPay and more',
    accent: 'from-slate-900 via-slate-700 to-slate-500',
  },
  {
    code: 'wallet',
    label: 'Wallets',
    helper: 'Popular mobile wallet flow',
    accent: 'from-fuchsia-500 via-pink-500 to-orange-400',
  },
  {
    code: 'netbanking',
    label: 'Netbanking',
    helper: 'Replica bank checkout experience',
    accent: 'from-emerald-500 via-teal-500 to-cyan-500',
  },
]

function msLeft(expiresAt) {
  const timestamp = new Date(expiresAt).getTime()
  return Math.max(0, timestamp - Date.now())
}

function formatShowDate(value) {
  if (!value) return 'TBA'
  return new Date(value).toLocaleString([], {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatCurrency(value) {
  return `₹${Number(value || 0)}`
}

export default function Payment() {
  const { auth } = useAuth()
  const { showId } = useParams()
  const location = useLocation()
  const nav = useNavigate()

  const [estimate, setEstimate] = useState(location.state?.estimate || null)
  const [showSummary, setShowSummary] = useState(location.state?.showSummary || null)
  const [paymentMethod, setPaymentMethod] = useState('upi')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)
  const [, setTick] = useState(0)
  const [booking, setBooking] = useState(null)
  const [successMessage, setSuccessMessage] = useState('')
  const seatCodes = useMemo(() => location.state?.seatCodes || [], [location.state])
  const expiresAt = location.state?.expiresAt
  const left = expiresAt ? msLeft(expiresAt) : 0

  useEffect(() => {
    if (!expiresAt || booking) return undefined
    const id = window.setInterval(() => setTick((value) => value + 1), 1000)
    return () => window.clearInterval(id)
  }, [booking, expiresAt])

  useEffect(() => {
    if (!seatCodes.length) return

    api(`/public/shows/${showId}/estimate`, {
      method: 'POST',
      body: { seatCodes },
    })
      .then((response) => {
        setEstimate(response)
        if (!showSummary && response.showSummary) setShowSummary(response.showSummary)
      })
      .catch(() => {})
  }, [seatCodes, showId, showSummary])

  useEffect(() => {
    if (!expiresAt || booking) return
    if (left > 0) return

    alert('Your seat lock expired. Please choose seats again.')
    nav(`/shows/${showId}/seats`, { replace: true })
  }, [booking, expiresAt, left, nav, showId])

  useEffect(() => {
    if (!booking?.ticket) return
    if (isUpcomingTicket(booking.ticket)) {
      downloadTicketPdf(booking.ticket)
      setSuccessMessage('Payment successful. Your ticket PDF has been downloaded.')
      window.alert('Payment successful. Your ticket has been booked and downloaded as a PDF.')
      return
    }

    setSuccessMessage('Payment successful. This show has expired, so PDF download is unavailable.')
    window.alert('Payment successful. This show has expired, so PDF download is unavailable.')
  }, [booking])

  if (!seatCodes.length || !expiresAt) {
    return (
      <div className="flex min-h-[calc(100vh-9rem)] items-center justify-center px-4">
        <div className="page-panel w-full max-w-md space-y-4 p-6">
          <div className="text-sm font-medium text-red-600">Missing seat selection.</div>
          <Link to="/" className="text-sm font-semibold text-slate-950 hover:text-blue-600">
            Go home
          </Link>
        </div>
      </div>
    )
  }

  async function confirm() {
    setErr('')
    setLoading(true)

    try {
      const response = await api('/bookings/confirm', {
        method: 'POST',
        token: auth.token,
        body: { showId: Number(showId), seatCodes },
      })

      setBooking({
        bookingId: response.bookingId,
        totalAmount: response.totalAmount,
        seatCodes,
        ticket: response.ticket || null,
      })
    } catch (e) {
      setErr(e.message)
    } finally {
      setLoading(false)
    }
  }

  const secs = Math.ceil(left / 1000)
  const totalAmount = booking?.totalAmount ?? estimate?.total ?? 0
  const breakdown = estimate?.breakdown || []
  const selectedMethod = PAYMENT_METHODS.find((item) => item.code === paymentMethod) || PAYMENT_METHODS[0]
  const canDownloadTicket = booking?.ticket ? isUpcomingTicket(booking.ticket) : false

  if (booking) {
    return (
      <div className="mx-auto max-w-5xl space-y-8 px-4 py-10 md:px-6">
        {successMessage ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 shadow-sm">
            {successMessage}
          </div>
        ) : null}

        <section className="page-panel px-6 py-8 md:px-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <div className="hero-chip">Booking Confirmed</div>
              <h2 className="section-title max-w-3xl">Your ticket is ready</h2>
              <p className="section-copy max-w-2xl">
                Seats, seat type, showtime, and payment summary are locked in. You can use this screen as your booking receipt.
              </p>
            </div>

            <div className="rounded-[1.75rem] border border-emerald-100 bg-emerald-50 px-5 py-4 shadow-sm">
              <div className="text-xs uppercase tracking-[0.18em] text-emerald-500">Booking ID</div>
              <div className="mt-2 text-2xl font-semibold text-emerald-950">#{booking.bookingId}</div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="page-panel px-6 py-7 md:px-8">
            <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Movie ticket</div>
            <div className="mt-3 text-3xl font-semibold text-slate-950">{showSummary?.movieTitle || 'Movie experience'}</div>
            <div className="mt-2 text-sm text-slate-500">
              {showSummary?.theaterName || 'Theatre'} • {showSummary?.hallName || 'Hall'}
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white/85 px-4 py-4 shadow-sm">
                <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Showtime</div>
                <div className="mt-2 text-sm font-semibold text-slate-900">{formatShowDate(showSummary?.startsAt)}</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white/85 px-4 py-4 shadow-sm">
                <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Language</div>
                <div className="mt-2 text-sm font-semibold text-slate-900">{showSummary?.language || 'Standard'}</div>
              </div>
            </div>

            <div className="mt-6 rounded-[1.75rem] border border-slate-200 bg-white/90 p-5 shadow-sm">
              <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Seats on ticket</div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {breakdown.map((seat) => (
                  <div key={seat.seatCode} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                    <div className="text-lg font-semibold text-slate-950">{seat.seatCode}</div>
                    <div className="mt-1 text-sm text-slate-500">{seat.seatTypeLabel}</div>
                    <div className="mt-2 text-sm font-medium text-slate-700">{formatCurrency(seat.price)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-[linear-gradient(160deg,rgba(15,23,42,0.98),rgba(30,41,59,0.96),rgba(37,99,235,0.88))] p-6 text-white shadow-[0_28px_70px_rgba(15,23,42,0.22)]">
            <div className="text-xs uppercase tracking-[0.22em] text-blue-100/75">Payment receipt</div>
            <div className="mt-3 text-3xl font-semibold">{formatCurrency(totalAmount)}</div>
            <div className="mt-1 text-sm text-blue-100/80">Paid through Razorpay demo checkout</div>

            <div className="mt-6 space-y-4 border-t border-white/10 pt-5 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-blue-100/80">Method</span>
                <span className="font-medium">{selectedMethod.label}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-blue-100/80">Seats</span>
                <span className="font-medium">{seatCodes.join(', ')}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-blue-100/80">Status</span>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${
                    canDownloadTicket
                      ? 'bg-emerald-400/15 text-emerald-100'
                      : 'bg-amber-300/20 text-amber-100'
                  }`}
                >
                  {canDownloadTicket ? 'Upcoming' : 'Show Expired'}
                </span>
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-3">
              <Link to="/" className="primary-button">
                Book another show
              </Link>
              <Link to="/my-tickets" className="secondary-button">
                Open my tickets
              </Link>
              <Link to={`/shows/${showId}/seats`} className="secondary-button">
                View seat map again
              </Link>
            </div>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-10 md:px-6">
      <section className="page-panel fade-up px-6 py-8 md:px-10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <div className="hero-chip">Payment Gateway</div>
            <h2 className="section-title max-w-3xl">Complete your booking with a Razorpay-style checkout</h2>
            <p className="section-copy max-w-2xl">
              This is a polished dummy payment flow. It looks like a real gateway, but the booking is completed only inside this app.
            </p>
          </div>

          <div className="rounded-[1.75rem] border border-pink-100 bg-gradient-to-br from-pink-50 to-orange-50 px-5 py-4 shadow-sm">
            <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Seat lock expires in</div>
            <div className={`mt-2 text-3xl font-semibold ${secs <= 15 ? 'text-red-600' : 'text-slate-950'}`}>{secs}s</div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="page-panel overflow-hidden p-0">
          <div className="bg-[linear-gradient(120deg,#07284e_0%,#114a98_36%,#2563eb_68%,#60a5fa_100%)] px-6 py-6 text-white md:px-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-[0.24em] text-blue-100/80">Razorpay Secure</div>
                <div className="mt-3 text-3xl font-semibold">{formatCurrency(totalAmount)}</div>
                <div className="mt-2 text-sm text-blue-100/85">{showSummary?.movieTitle || 'Your show booking'}</div>
              </div>

              <div className="rounded-2xl bg-white/10 px-4 py-3 text-right backdrop-blur-sm">
                <div className="text-[11px] uppercase tracking-[0.2em] text-blue-100/70">Seats</div>
                <div className="mt-2 text-sm font-semibold text-white">{seatCodes.join(', ')}</div>
              </div>
            </div>
          </div>

          <div className="space-y-6 px-6 py-6 md:px-8">
            <div className="grid gap-3 sm:grid-cols-2">
              {PAYMENT_METHODS.map((method) => (
                <button
                  key={method.code}
                  type="button"
                  onClick={() => setPaymentMethod(method.code)}
                  className={`rounded-[1.5rem] border px-4 py-4 text-left transition-all ${
                    paymentMethod === method.code
                      ? 'border-blue-300 bg-blue-50 shadow-[0_12px_30px_rgba(59,130,246,0.12)]'
                      : 'border-slate-200 bg-white hover:-translate-y-0.5 hover:border-slate-300'
                  }`}
                >
                  <div className={`mb-3 h-2 rounded-full bg-gradient-to-r ${method.accent}`} />
                  <div className="text-sm font-semibold text-slate-950">{method.label}</div>
                  <div className="mt-1 text-xs text-slate-500">{method.helper}</div>
                </button>
              ))}
            </div>

            <div className="rounded-[1.75rem] border border-slate-200 bg-white/85 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Selected payment method</div>
                  <div className="mt-2 text-lg font-semibold text-slate-950">{selectedMethod.label}</div>
                </div>
                <div className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">
                  Demo
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Showtime</div>
                  <div className="mt-2 text-sm font-semibold text-slate-900">{formatShowDate(showSummary?.startsAt)}</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Venue</div>
                  <div className="mt-2 text-sm font-semibold text-slate-900">
                    {showSummary?.theaterName || 'Theatre'}
                    <span className="block text-xs font-medium text-slate-500">{showSummary?.hallName || 'Hall'}</span>
                  </div>
                </div>
              </div>
            </div>

            {err ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 shadow-sm">
                {err}
              </div>
            ) : null}

            <button
              type="button"
              disabled={loading || secs <= 0}
              onClick={confirm}
              className="primary-button w-full"
            >
              {loading ? 'Processing booking...' : `Pay ${formatCurrency(totalAmount)}`}
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <section className="page-panel px-6 py-7">
            <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Seat ticket summary</div>
            <div className="mt-4 space-y-3">
              {breakdown.map((seat) => (
                <div key={seat.seatCode} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white/90 px-4 py-4 shadow-sm">
                  <div>
                    <div className="text-base font-semibold text-slate-950">{seat.seatCode}</div>
                    <div className="text-sm text-slate-500">{seat.seatTypeLabel}</div>
                  </div>
                  <div className="text-sm font-semibold text-slate-900">{formatCurrency(seat.price)}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-[linear-gradient(160deg,rgba(255,255,255,0.96),rgba(239,246,255,0.88),rgba(255,247,237,0.88))] px-6 py-7 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
            <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Order details</div>
            <div className="mt-5 space-y-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Movie</span>
                <span className="max-w-[60%] text-right font-medium text-slate-900">{showSummary?.movieTitle || 'Show'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Language</span>
                <span className="font-medium text-slate-900">{showSummary?.language || 'Standard'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Tickets</span>
                <span className="font-medium text-slate-900">{seatCodes.length}</span>
              </div>
              <div className="flex items-center justify-between border-t border-slate-200 pt-4">
                <span className="text-slate-500">Total payable</span>
                <span className="text-xl font-semibold text-slate-950">{formatCurrency(totalAmount)}</span>
              </div>
            </div>

            <Link to={`/shows/${showId}/seats`} className="secondary-button mt-6 w-full">
              Back to seats
            </Link>
          </section>
        </div>
      </section>
    </div>
  )
}
