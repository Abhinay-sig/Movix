import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { downloadPaymentSlipPdf } from '../lib/paymentSlipPdf'
import { downloadCalendarInvite, openCalendarAdd } from '../lib/ticketCalendar'
import { downloadTicketPdf, isUpcomingTicket } from '../lib/ticketPdf'
import { useAuth } from '../useAuth'
import { formatDateTimeTo12Hour } from '../lib/time'

function formatShowDate(value) {
  return formatDateTimeTo12Hour(value, { weekday: 'short', day: 'numeric', month: 'short' })
}

function formatCurrency(value) {
  return `₹${Number(value || 0)}`
}

export default function MyTickets() {
  const { auth, logout } = useAuth()
  const [redirecting, setRedirecting] = useState(false)
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')

  useEffect(() => {
    let alive = true

    api('/bookings/my', { token: auth.token })
      .then((response) => {
        if (!alive) return
        setBookings(response.bookings || [])
        setErr('')
      })
      .catch((e) => {
        if (!alive) return
        if (e.status === 401) {
          setRedirecting(true)
          logout()
          return
        }
        setErr(e.message)
      })
      .finally(() => {
        if (alive) setLoading(false)
      })

    return () => {
      alive = false
    }
  }, [auth.token, logout])

  if (redirecting) {
    return <div className="py-10 text-center text-slate-500">Redirecting to login...</div>
  }

  if (loading) {
    return <div className="py-10 text-center text-slate-500">Loading your tickets...</div>
  }

  if (err) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 shadow-sm">
        {err}
      </div>
    )
  }

  if (!bookings.length) {
    return (
      <div className="page-panel mx-auto max-w-2xl space-y-4 px-6 py-8 text-center">
        <div className="hero-chip mx-auto">My Tickets</div>
        <h2 className="section-title">No bookings yet</h2>
        <p className="section-copy">Once you book a show, your ticket will appear here with all details and a PDF download option.</p>
        <Link to="/" className="primary-button mx-auto">
          Browse shows
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-4 md:px-6">
      <section className="page-panel px-6 py-8 md:px-8">
        <div className="hero-chip">My Tickets</div>
        <h2 className="section-title mt-3">Your confirmed bookings</h2>
        <p className="section-copy mt-2">Every successful payment appears here with ticket, payment proof, and calendar actions.</p>
      </section>

      <section className="space-y-5">
        {bookings.map((booking) => (
          <article key={booking.bookingId} className="page-panel px-6 py-7 md:px-8">
            {(() => {
              const isUpcoming = isUpcomingTicket(booking)
              return (
                <>
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.2em] text-slate-400">
                  <span>Booking #{booking.bookingId}</span>
                  <span
                    className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                      isUpcoming
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {isUpcoming ? 'Upcoming Show' : 'Show Expired'}
                  </span>
                </div>
                <h3 className="text-2xl font-semibold text-slate-950">{booking.show?.movieTitle || 'Movie ticket'}</h3>
                <div className="text-sm text-slate-500">
                  {booking.show?.theaterName || 'Theatre'} • {booking.show?.hallName || 'Hall'}
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <button type="button" onClick={() => downloadPaymentSlipPdf(booking)} className="secondary-button">
                  Payment slip
                </button>
                <button
                  type="button"
                  onClick={() => downloadTicketPdf(booking)}
                  disabled={!isUpcoming}
                  className={`primary-button ${!isUpcoming ? 'cursor-not-allowed opacity-60' : ''}`}
                >
                  {isUpcoming ? 'Ticket PDF' : 'Ticket PDF unavailable'}
                </button>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-white/90 px-4 py-4 shadow-sm">
                <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Showtime</div>
                <div className="mt-2 text-sm font-semibold text-slate-900">{formatShowDate(booking.show?.startsAt)}</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white/90 px-4 py-4 shadow-sm">
                <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Seats</div>
                <div className="mt-2 text-sm font-semibold text-slate-900">{(booking.seats || []).map((seat) => seat.seatCode).join(', ')}</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white/90 px-4 py-4 shadow-sm">
                <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Paid</div>
                <div className="mt-2 text-sm font-semibold text-slate-900">{formatCurrency(booking.totalAmount)}</div>
              </div>
            </div>
            {!isUpcoming ? (
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                This show has already finished, so ticket PDF and calendar actions are disabled. Your payment slip is still available.
              </div>
            ) : (
              <div className="mt-4 flex flex-wrap gap-3">
                <button type="button" onClick={() => openCalendarAdd(booking)} className="secondary-button">
                  Add to calendar
                </button>
                <button type="button" onClick={() => downloadCalendarInvite(booking)} className="secondary-button">
                  Download .ics
                </button>
              </div>
            )}
                </>
              )
            })()}
          </article>
        ))}
      </section>
    </div>
  )
}
