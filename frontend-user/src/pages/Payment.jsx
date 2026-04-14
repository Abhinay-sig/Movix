import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { api } from '../lib/api'
import { downloadPaymentSlipPdf } from '../lib/paymentSlipPdf'
import { loadRazorpayCheckout, openRazorpayCheckout } from '../lib/razorpay'
import {
  clearPendingSeatRelease,
  getSeatSessionToken,
  resetSeatSessionToken,
  savePendingSeatRelease,
} from '../lib/seatSession'
import { downloadCalendarInvite, openCalendarAdd } from '../lib/ticketCalendar'
import { downloadTicketPdf, isUpcomingTicket } from '../lib/ticketPdf'
import { formatDateTimeTo12Hour } from '../lib/time'
import { useAuth } from '../useAuth'
import { useNotification } from '../NotificationProvider'

function msLeft(expiresAt) {
  const timestamp = new Date(expiresAt).getTime()
  return Math.max(0, timestamp - Date.now())
}

function formatHoldCountdown(totalSeconds) {
  const safeSeconds = Math.max(0, Number(totalSeconds) || 0)
  const minutes = Math.floor(safeSeconds / 60)
  const seconds = safeSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function formatShowDate(value) {
  return formatDateTimeTo12Hour(value, { weekday: 'short', day: 'numeric', month: 'short' })
}

function formatCurrency(value) {
  return `₹${Number(value || 0)}`
}

function isEmailValid(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim())
}

function normalizeErrorMessage(error) {
  if (String(error?.message || '').includes('returned HTML instead of JSON')) {
    return 'Movix could not reach the payment server. Make sure the backend is running on port 3001 and try again.'
  }
  if (String(error?.message || '').includes('Razorpay checkout failed to load')) {
    return 'Razorpay Checkout did not finish loading. Refresh the page and try again.'
  }
  if (String(error?.message || '').includes('Unable to load Razorpay checkout right now.')) {
    return 'Razorpay Checkout is unavailable right now. Check your internet connection and try again.'
  }
  return error?.message || 'Something went wrong while processing the payment.'
}

export default function Payment() {
  const { auth, logout } = useAuth()
  const { showNotification } = useNotification()
  const { showId } = useParams()
  const location = useLocation()
  const nav = useNavigate()
  const seatSessionToken = useMemo(() => getSeatSessionToken(), [])

  const [estimate, setEstimate] = useState(location.state?.estimate || null)
  const [showSummary, setShowSummary] = useState(location.state?.showSummary || null)
  const [holdExpiresAt, setHoldExpiresAt] = useState(location.state?.expiresAt || null)
  const [configuredHoldMs] = useState(Number(location.state?.holdMs) || 0)
  const [email, setEmail] = useState(auth.user?.email || '')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)
  const [paymentStep, setPaymentStep] = useState('')
  const [booking, setBooking] = useState(null)
  const [holdSecondsLeft, setHoldSecondsLeft] = useState(() =>
    location.state?.expiresAt ? Math.max(0, Math.ceil(msLeft(location.state.expiresAt) / 1000)) : 0
  )
  const [showHoldExpiredModal, setShowHoldExpiredModal] = useState(false)
  const [holdExpiredMessage, setHoldExpiredMessage] = useState(
    'Your seat hold expired. Please choose your seats again.'
  )
  const [showSuccessModal, setShowSuccessModal] = useState(false)

  const seatCodes = useMemo(() => location.state?.seatCodes || [], [location.state])
  const displaySeatCodes = useMemo(() => location.state?.displaySeatCodes || [], [location.state])
  const breakdown = estimate?.breakdown || []
  const totalAmount = booking?.totalAmount ?? estimate?.total ?? 0
  const canDownloadTicket = booking?.ticket ? isUpcomingTicket(booking.ticket) : false
  const bookingRef = useRef(booking)
  const seatCodesRef = useRef(seatCodes)
  const tokenRef = useRef(auth.token)
  const showIdRef = useRef(showId)

  useEffect(() => {
    bookingRef.current = booking
  }, [booking])

  useEffect(() => {
    seatCodesRef.current = seatCodes
  }, [seatCodes])

  useEffect(() => {
    tokenRef.current = auth.token
  }, [auth.token])

  useEffect(() => {
    showIdRef.current = showId
  }, [showId])

  const releaseHeldSeats = useCallback(
    async ({ keepalive = false } = {}) => {
      if (bookingRef.current || !seatCodesRef.current.length || !tokenRef.current) return false

      try {
        await api('/holds/release', {
          method: 'POST',
          token: tokenRef.current,
          keepalive,
          body: {
            showId: Number(showIdRef.current),
            seatCodes: seatCodesRef.current,
            sessionToken: seatSessionToken,
          },
        })
        clearPendingSeatRelease()
        return true
      } catch {
        return false
      }
    },
    [seatSessionToken]
  )

  useEffect(() => {
    function persistPendingRelease() {
      if (bookingRef.current || !seatCodesRef.current.length) return
      savePendingSeatRelease({
        showId: Number(showIdRef.current),
        seatCodes: [...seatCodesRef.current],
        sessionToken: seatSessionToken,
      })
    }

    function releaseHeldSeatsOnExit() {
      persistPendingRelease()
      void releaseHeldSeats({ keepalive: true })
    }

    window.addEventListener('pagehide', releaseHeldSeatsOnExit)
    window.addEventListener('beforeunload', releaseHeldSeatsOnExit)
    window.addEventListener('popstate', releaseHeldSeatsOnExit)

    return () => {
      window.removeEventListener('pagehide', releaseHeldSeatsOnExit)
      window.removeEventListener('beforeunload', releaseHeldSeatsOnExit)
      window.removeEventListener('popstate', releaseHeldSeatsOnExit)
      persistPendingRelease()
    }
  }, [releaseHeldSeats, seatSessionToken])

  const openHoldExpiredPopup = useCallback((message = 'Your seat hold expired. Please choose your seats again.') => {
    setErr('')
    setHoldSecondsLeft(0)
    setHoldExpiredMessage(message)
    setShowHoldExpiredModal(true)
  }, [])

  const handleAuthFailure = useCallback(() => {
    logout()
    nav('/login', {
      replace: true,
      state: { from: `/shows/${showId}/payment` },
    })
  }, [logout, nav, showId])

  const goBackToSeatSelection = useCallback(async () => {
    const abandonedSessionToken = seatSessionToken
    const abandonedSeatCodes = [...seatCodesRef.current]
    savePendingSeatRelease({
      showId: Number(showId),
      seatCodes: abandonedSeatCodes,
      sessionToken: abandonedSessionToken,
    })
    await releaseHeldSeats()
    resetSeatSessionToken()
    nav(`/shows/${showId}/seats`, {
      replace: true,
      state: {
        releaseHold: {
          seatCodes: abandonedSeatCodes,
          sessionToken: abandonedSessionToken,
        },
      },
    })
  }, [nav, releaseHeldSeats, seatSessionToken, showId])

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
    if (!holdExpiresAt || booking) {
      setHoldSecondsLeft(0)
      return undefined
    }

    setShowHoldExpiredModal(false)

    function syncCountdown() {
      setHoldSecondsLeft(Math.max(0, Math.ceil(msLeft(holdExpiresAt) / 1000)))
    }

    syncCountdown()
    const id = window.setInterval(syncCountdown, 1000)
    return () => window.clearInterval(id)
  }, [booking, holdExpiresAt])

  useEffect(() => {
    if (!holdExpiresAt || booking || showHoldExpiredModal) return
    if (holdSecondsLeft > 0) return
    openHoldExpiredPopup()
  }, [booking, holdExpiresAt, holdSecondsLeft, openHoldExpiredPopup, showHoldExpiredModal])

  useEffect(() => {
    if (!booking) return
    setShowSuccessModal(true)
  }, [booking])

  useEffect(() => {
    loadRazorpayCheckout().catch(() => {})
  }, [])

  async function startPayment() {
    const trimmedEmail = String(email || '').trim()
    if (!isEmailValid(trimmedEmail)) {
      setErr('Enter a valid registered email address before continuing.')
      return
    }
    if (!seatCodes.length) {
      setErr('Select your seats again to continue.')
      return
    }
    if (holdSecondsLeft <= 0) {
      openHoldExpiredPopup()
      return
    }

    setErr('')
    setLoading(true)
    setPaymentStep('Creating Razorpay order...')

    try {
      const orderResponse = await api('/payments/razorpay/order', {
        method: 'POST',
        token: auth.token,
        body: {
          showId: Number(showId),
          seatCodes,
          email: trimmedEmail,
          sessionToken: seatSessionToken,
        },
      })

      setHoldExpiresAt(orderResponse.checkout?.expiresAt || holdExpiresAt)
      setPaymentStep('Opening Razorpay...')

      const razorpayResponse = await openRazorpayCheckout({
        key: orderResponse.checkout.key,
        amount: orderResponse.order.amount,
        currency: orderResponse.order.currency,
        name: orderResponse.checkout.name,
        description: orderResponse.checkout.description,
        order_id: orderResponse.order.id,
        prefill: {
          name: auth.user?.name || 'Movix customer',
          email: trimmedEmail,
        },
        notes: {
          seats: (displaySeatCodes.length ? displaySeatCodes : seatCodes).join(', '),
          showId: String(showId),
        },
        theme: {
          color: '#1d4ed8',
        },
      })

      setPaymentStep('Verifying payment...')
      const verifyResponse = await api('/payments/razorpay/verify', {
        method: 'POST',
        token: auth.token,
        body: {
          showId: Number(showId),
          seatCodes,
          email: trimmedEmail,
          sessionToken: seatSessionToken,
          razorpayOrderId: razorpayResponse.razorpay_order_id,
          razorpayPaymentId: razorpayResponse.razorpay_payment_id,
          razorpaySignature: razorpayResponse.razorpay_signature,
        },
      })

      setBooking({
        bookingId: verifyResponse.bookingId,
        totalAmount: verifyResponse.totalAmount,
        ticket: verifyResponse.ticket || null,
      })
      clearPendingSeatRelease()
      showNotification({
        title: 'Payment successful',
        message: 'Your seats are booked and your receipt is ready.',
        type: 'success',
      })
    } catch (error) {
      if (error.status === 401) {
        handleAuthFailure()
        return
      }
      if (error.status === 409) {
        openHoldExpiredPopup(error.message || 'Your seat hold expired. Please choose your seats again.')
        return
      }
      setErr(normalizeErrorMessage(error))
    } finally {
      setLoading(false)
      setPaymentStep('')
    }
  }

  if (!seatCodes.length || !holdExpiresAt) {
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

  if (booking) {
    return (
      <div className="mx-auto max-w-5xl space-y-8 px-4 py-10 md:px-6">
        {showSuccessModal ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-[2rem] border border-white/20 bg-white p-6 shadow-[0_28px_90px_rgba(15,23,42,0.35)]">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-xl font-bold text-emerald-700">
                M
              </div>
              <div className="mt-4 text-center">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">Payment successful</div>
                <div className="mt-2 text-2xl font-semibold text-slate-950">Booking confirmed</div>
                <p className="mt-3 text-sm leading-6 text-slate-500">
                  Razorpay confirmed your payment and Movix issued the booking instantly.
                </p>
              </div>
              <button type="button" onClick={() => setShowSuccessModal(false)} className="primary-button mt-6 w-full">
                Continue
              </button>
            </div>
          </div>
        ) : null}

        <section className="page-panel px-6 py-8 md:px-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <div className="hero-chip">Booking Confirmed</div>
              <h2 className="section-title max-w-3xl">Your payment and ticket are ready</h2>
              <p className="section-copy max-w-2xl">
                Download the ticket, save the payment slip, or add the show to your calendar right away.
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
            <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Ticket details</div>
            <div className="mt-3 text-3xl font-semibold text-slate-950">{showSummary?.movieTitle || 'Movie booking'}</div>
            <div className="mt-2 text-sm text-slate-500">
              {showSummary?.theaterName || 'Theatre'} • {showSummary?.hallName || 'Hall'}
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white/85 px-4 py-4 shadow-sm">
                <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Showtime</div>
                <div className="mt-2 text-sm font-semibold text-slate-900">{formatShowDate(showSummary?.startsAt)}</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white/85 px-4 py-4 shadow-sm">
                <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Paid</div>
                <div className="mt-2 text-sm font-semibold text-slate-900">{formatCurrency(totalAmount)}</div>
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
            <div className="text-xs uppercase tracking-[0.22em] text-blue-100/75">Post-booking actions</div>
            <div className="mt-3 text-3xl font-semibold">{formatCurrency(totalAmount)}</div>
            <div className="mt-1 text-sm text-blue-100/80">
              Razorpay payment ID: {booking.ticket?.payment?.paymentId || 'Unavailable'}
            </div>

            <div className="mt-6 space-y-3">
              <button
                type="button"
                onClick={() => downloadPaymentSlipPdf(booking.ticket)}
                className="primary-button w-full bg-white text-slate-950 hover:bg-slate-100"
              >
                Download payment slip
              </button>

              <button
                type="button"
                onClick={() => downloadTicketPdf(booking.ticket)}
                disabled={!canDownloadTicket}
                className={`secondary-button w-full border-white/20 bg-white/10 text-white hover:bg-white/15 ${
                  !canDownloadTicket ? 'cursor-not-allowed opacity-60' : ''
                }`}
              >
                {canDownloadTicket ? 'Download ticket PDF' : 'Ticket PDF unavailable'}
              </button>

              <button
                type="button"
                onClick={() => openCalendarAdd(booking.ticket)}
                disabled={!canDownloadTicket}
                className={`secondary-button w-full border-white/20 bg-white/10 text-white hover:bg-white/15 ${
                  !canDownloadTicket ? 'cursor-not-allowed opacity-60' : ''
                }`}
              >
                Add to calendar
              </button>

              <button
                type="button"
                onClick={() => downloadCalendarInvite(booking.ticket)}
                disabled={!canDownloadTicket}
                className={`secondary-button w-full border-white/20 bg-white/10 text-white hover:bg-white/15 ${
                  !canDownloadTicket ? 'cursor-not-allowed opacity-60' : ''
                }`}
              >
                Download .ics
              </button>

              <Link to="/my-tickets" className="secondary-button block w-full border-white/20 bg-transparent text-center text-white hover:bg-white/10">
                View all tickets
              </Link>
            </div>
          </div>
        </section>
      </div>
    )
  }

  const formattedHoldTime = formatHoldCountdown(holdSecondsLeft)
  const configuredHoldMinutes =
    configuredHoldMs > 0 ? Math.max(1, Math.round(configuredHoldMs / 60000)) : null

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 md:px-6">
      {showHoldExpiredModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[2rem] border border-white/20 bg-white p-6 shadow-[0_28px_90px_rgba(15,23,42,0.35)]">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-red-500">Seat hold expired</div>
            <div className="mt-3 text-2xl font-semibold text-slate-950">Choose seats again</div>
            <p className="mt-3 text-sm leading-6 text-slate-500">{holdExpiredMessage}</p>
            <button type="button" onClick={goBackToSeatSelection} className="primary-button mt-6 w-full">
              Return to seat selection
            </button>
          </div>
        </div>
      ) : null}

      <section className="page-panel px-6 py-8 md:px-10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <div className="hero-chip">Razorpay Checkout</div>
            <h2 className="section-title max-w-3xl">Secure your seats before the hold ends</h2>
            <p className="section-copy max-w-2xl">
              We’ll create a Razorpay order for your held seats, open the hosted checkout, then verify the payment before issuing the ticket.
            </p>
          </div>

          <div className="rounded-[1.75rem] border border-amber-100 bg-amber-50 px-5 py-4 shadow-sm">
            <div className="text-xs uppercase tracking-[0.18em] text-amber-600">Seat hold</div>
            <div className="mt-2 text-3xl font-semibold text-amber-950">{formattedHoldTime}</div>
            <div className="mt-1 text-xs text-amber-700">
              {configuredHoldMinutes ? `Hold window ${configuredHoldMinutes} minute(s)` : 'Your hold is active'}
            </div>
          </div>
        </div>
      </section>

      {err ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 shadow-sm">
          {err}
        </div>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="page-panel px-6 py-7 md:px-8">
          <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Payer details</div>
          <div className="mt-4 rounded-[1.75rem] border border-slate-200 bg-white/90 p-5 shadow-sm">
            <label className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Registered email</div>
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Enter your registered email"
                className="field-input"
              />
            </label>

            <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-4 text-sm text-blue-700">
              Razorpay will handle UPI, cards, wallets, and netbanking inside the hosted checkout window. The email above must match your Movix account.
            </div>
          </div>

          <div className="mt-6 rounded-[1.75rem] border border-slate-200 bg-white/90 p-5 shadow-sm">
            <div className="text-xs uppercase tracking-[0.18em] text-slate-400">What happens next</div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="text-sm font-semibold text-slate-900">1. Create order</div>
                <div className="mt-1 text-xs text-slate-500">Movix locks your amount and requests a Razorpay order.</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="text-sm font-semibold text-slate-900">2. Pay securely</div>
                <div className="mt-1 text-xs text-slate-500">Razorpay Checkout collects the actual payment details.</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="text-sm font-semibold text-slate-900">3. Verify booking</div>
                <div className="mt-1 text-xs text-slate-500">We verify the signature, confirm seats, and issue your receipt.</div>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-[linear-gradient(160deg,rgba(15,23,42,0.98),rgba(30,41,59,0.96),rgba(37,99,235,0.88))] p-6 text-white shadow-[0_28px_70px_rgba(15,23,42,0.22)]">
          <div className="text-xs uppercase tracking-[0.22em] text-blue-100/75">Booking summary</div>
          <div className="mt-3 text-3xl font-semibold">{formatCurrency(totalAmount)}</div>
          <div className="mt-1 text-sm text-blue-100/80">{seatCodes.length} seat(s) reserved</div>

          <div className="mt-6 space-y-3 border-t border-white/10 pt-5 text-sm">
            <div className="flex items-center justify-between gap-4">
              <span className="text-blue-100/80">Movie</span>
              <span className="text-right font-medium">{showSummary?.movieTitle || 'Show'}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-blue-100/80">Venue</span>
              <span className="text-right font-medium">
                {showSummary?.theaterName || 'Theatre'} • {showSummary?.hallName || 'Hall'}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-blue-100/80">Showtime</span>
              <span className="text-right font-medium">{formatShowDate(showSummary?.startsAt)}</span>
            </div>
            <div className="flex items-start justify-between gap-4">
              <span className="text-blue-100/80">Seats</span>
              <span className="text-right font-medium">{(displaySeatCodes.length ? displaySeatCodes : seatCodes).join(', ')}</span>
            </div>
          </div>

          <div className="mt-6 space-y-3 border-t border-white/10 pt-5">
            {breakdown.map((seat) => (
              <div key={seat.seatCode} className="flex items-center justify-between gap-4 text-sm">
                <span className="text-blue-100/80">
                  {seat.seatCode} • {seat.seatTypeLabel}
                </span>
                <span className="font-medium">{formatCurrency(seat.price)}</span>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-col gap-3">
            <button
              type="button"
              onClick={startPayment}
              disabled={loading || holdSecondsLeft <= 0}
              className="primary-button w-full bg-white text-slate-950 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? paymentStep || 'Opening Razorpay...' : `Pay ${formatCurrency(totalAmount)}`}
            </button>

            <button
              type="button"
              onClick={goBackToSeatSelection}
              disabled={loading}
              className="secondary-button w-full border-white/20 bg-transparent text-white hover:bg-white/10"
            >
              Change seats
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
