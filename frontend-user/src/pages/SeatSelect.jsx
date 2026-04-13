import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../lib/api'
import { getSeatSessionToken } from '../lib/seatSession'
import { useAuth } from '../useAuth'
import { buildVisibleSeatRows } from '../lib/seatLayout'
import { formatDateTimeTo12Hour } from '../lib/time'

const MAX_SELECTABLE_SEATS = 10

const SEAT_THEME = {
  standard: {
    label: 'Standard',
    base: 'border-slate-300 bg-white text-slate-700',
    highlight: 'border-slate-500 bg-slate-100 text-slate-900',
  },
  premium: {
    label: 'Premium',
    base: 'border-blue-200 bg-blue-50 text-blue-700',
    highlight: 'border-blue-400 bg-blue-100 text-blue-900',
  },
  recliner: {
    label: 'Recliner',
    base: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    highlight: 'border-emerald-400 bg-emerald-100 text-emerald-900',
  },
  vip: {
    label: 'VIP',
    base: 'border-amber-200 bg-amber-50 text-amber-700',
    highlight: 'border-amber-400 bg-amber-100 text-amber-900',
  },
}

function formatShowDate(value) {
  return formatDateTimeTo12Hour(value, { weekday: 'short', day: 'numeric', month: 'short' })
}

function useViewport() {
  const [viewport, setViewport] = useState(() => ({
    width: typeof window === 'undefined' ? 1280 : window.innerWidth,
    height: typeof window === 'undefined' ? 900 : window.innerHeight,
  }))

  useEffect(() => {
    function onResize() {
      setViewport({ width: window.innerWidth, height: window.innerHeight })
    }

    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  return viewport
}

function sortSeatCodes(seatCodes) {
  return [...seatCodes].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
}

function displaySeatCodeForAbsolute(rows, absoluteSeatCode) {
  for (const row of rows) {
    const seat = row.cells.find((cell) => cell?.seatCode === absoluteSeatCode)
    if (seat) return seat.displaySeatCode || seat.seatCode
  }
  return absoluteSeatCode
}

export default function SeatSelect() {
  const { auth, logout } = useAuth()
  const { showId } = useParams()
  const nav = useNavigate()
  const viewport = useViewport()
  const seatSessionToken = useMemo(() => getSeatSessionToken(), [])

  const [data, setData] = useState(null)
  const [err, setErr] = useState('')
  const [selected, setSelected] = useState(() => new Set())
  const [dragMode, setDragMode] = useState(null)
  const [conflictNote, setConflictNote] = useState('')
  const [loadingHold, setLoadingHold] = useState(false)

  useEffect(() => {
    let alive = true

    async function loadSeatMap(keepError = false) {
      try {
        const response = await api(`/public/shows/${showId}/seatmap`, {
          headers: { 'x-seat-session': seatSessionToken },
        })
        if (!alive) return
        setData(response)
        if (!keepError) setErr('')
      } catch (e) {
        if (alive) setErr(e.message)
      }
    }

    loadSeatMap()
    return () => {
      alive = false
    }
  }, [seatSessionToken, showId])

  useEffect(() => {
    let alive = true

    async function refreshSeatMap(keepError = false) {
      try {
        const response = await api(`/public/shows/${showId}/seatmap`, {
          headers: { 'x-seat-session': seatSessionToken },
        })
        if (!alive) return
        setData(response)
        if (!keepError) setErr('')
      } catch (e) {
        if (alive) setErr(e.message)
      }
    }

    const id = window.setInterval(() => {
      refreshSeatMap(true)
    }, 5000)

    return () => {
      alive = false
      window.clearInterval(id)
    }
  }, [seatSessionToken, showId])

  const booked = useMemo(() => new Set(data?.bookedSeats || []), [data])
  const held = useMemo(() => new Set(data?.heldSeats || []), [data])
  const heldByMe = useMemo(() => new Set(data?.heldByMeSeats || []), [data])
  const selectedArr = useMemo(() => sortSeatCodes(Array.from(selected)), [selected])

  const seatTypeMap = useMemo(() => {
    const entries = (data?.seatTypes || []).map((seatType) => [
      seatType.code,
      {
        displayName: seatType.displayName,
        price: Number(seatType.price || 0),
      },
    ])
    return new Map(entries)
  }, [data])

  const { rows, bounds } = useMemo(
    () => buildVisibleSeatRows(data?.layout),
    [data?.layout]
  )

  const selectedDisplayArr = useMemo(
    () => selectedArr.map((seatCode) => displaySeatCodeForAbsolute(rows, seatCode)),
    [rows, selectedArr]
  )

  const seatStats = useMemo(() => {
    const summary = new Map()

    selectedArr.forEach((seatCode) => {
      for (const row of rows) {
        const seat = row.cells.find((cell) => cell?.seatCode === seatCode)
        if (!seat) continue

        const info = seatTypeMap.get(seat.seatTypeCode)
        const entry = summary.get(seat.seatTypeCode) || {
          code: seat.seatTypeCode,
          label: info?.displayName || SEAT_THEME[seat.seatTypeCode]?.label || 'Seat',
          count: 0,
          price: info?.price || 0,
        }
        entry.count += 1
        summary.set(seat.seatTypeCode, entry)
      }
    })

    return Array.from(summary.values())
  }, [rows, seatTypeMap, selectedArr])

  const totalAmount = useMemo(
    () => seatStats.reduce((sum, item) => sum + item.count * item.price, 0),
    [seatStats]
  )

  useEffect(() => {
    if (!selected.size) return

    const unavailable = selectedArr.filter(
      (seatCode) => booked.has(seatCode) || (held.has(seatCode) && !heldByMe.has(seatCode))
    )
    if (!unavailable.length) return

    setSelected((prev) => {
      const next = new Set(prev)
      unavailable.forEach((seatCode) => next.delete(seatCode))
      return next
    })
    setConflictNote(
      `${unavailable.map((seatCode) => displaySeatCodeForAbsolute(rows, seatCode)).join(', ')} just became unavailable, so they were removed from your selection.`
    )
  }, [booked, held, heldByMe, rows, selected, selectedArr])

  useEffect(() => {
    if (!dragMode) return undefined

    function clearDrag() {
      setDragMode(null)
    }

    window.addEventListener('pointerup', clearDrag)
    window.addEventListener('pointercancel', clearDrag)
    return () => {
      window.removeEventListener('pointerup', clearDrag)
      window.removeEventListener('pointercancel', clearDrag)
    }
  }, [dragMode])

  function applySeatChoice(seatCode, shouldSelect) {
    if (booked.has(seatCode) || (held.has(seatCode) && !heldByMe.has(seatCode))) return

    setSelected((prev) => {
      const next = new Set(prev)
      if (shouldSelect) {
        if (next.has(seatCode)) return prev
        if (next.size >= MAX_SELECTABLE_SEATS) return prev
        next.add(seatCode)
      } else {
        next.delete(seatCode)
      }
      return next
    })
  }

  function startDrag(seatCode) {
    if (booked.has(seatCode) || (held.has(seatCode) && !heldByMe.has(seatCode))) return
    const shouldSelect = !selected.has(seatCode)
    applySeatChoice(seatCode, shouldSelect)
    setConflictNote('')
    setDragMode({ shouldSelect })
  }

  async function proceed() {
    if (selectedArr.length < 1) {
      alert('Select at least 1 seat.')
      return
    }

    setLoadingHold(true)
    try {
      const hold = await api('/holds', {
        method: 'POST',
        token: auth.token,
        body: { showId: Number(showId), seatCodes: selectedArr, sessionToken: seatSessionToken },
      })

      nav(`/shows/${showId}/payment`, {
        state: {
          seatCodes: selectedArr,
          displaySeatCodes: selectedDisplayArr,
          expiresAt: hold.expiresAt,
          estimate: {
            total: totalAmount,
            breakdown: selectedArr.map((seatCode) => {
              const seat = rows.flatMap((row) => row.cells).find((cell) => cell?.seatCode === seatCode)
              const seatType = seatTypeMap.get(seat?.seatTypeCode || 'standard')
              return {
                seatCode: seat?.displaySeatCode || seatCode,
                seatTypeCode: seat?.seatTypeCode || 'standard',
                seatTypeLabel:
                  seatType?.displayName ||
                  SEAT_THEME[seat?.seatTypeCode || 'standard']?.label ||
                  'Standard',
                price: Number(seatType?.price || 0),
              }
            }),
          },
          showSummary: data?.showSummary || null,
          seatTypes: data?.seatTypes || [],
        },
      })
    } catch (e) {
      if (e.status === 401) {
        logout()
        nav('/login', {
          replace: true,
          state: { from: `/shows/${showId}/seats` },
        })
        return
      }

      alert(e.message)
      try {
        const response = await api(`/public/shows/${showId}/seatmap`, {
          headers: { 'x-seat-session': seatSessionToken },
        })
        setData(response)
      } catch {
        // ignore refresh error after failed hold attempt
      }
    } finally {
      setLoadingHold(false)
    }
  }

  if (err) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 shadow-sm">
        {err}
      </div>
    )
  }

  if (!data) {
    return <div className="py-10 text-center text-gray-500">Loading seats...</div>
  }

  const showSummary = data.showSummary || {}
  const gap = viewport.width < 768 ? 4 : 6
  const rowLabelWidth = viewport.width < 768 ? 26 : 34
  const availableWidth = Math.min(viewport.width - (viewport.width < 768 ? 60 : 140), 1120)
  const availableHeight = Math.max(180, viewport.height - (viewport.width < 768 ? 420 : 430))
  const widthBasedSeatSize = Math.floor(
    (availableWidth - rowLabelWidth - Math.max(0, bounds.visibleCols - 1) * gap) /
      Math.max(bounds.visibleCols, 1)
  )
  const heightBasedSeatSize = Math.floor(
    (availableHeight - Math.max(0, bounds.visibleRows - 1) * gap) /
      Math.max(bounds.visibleRows, 1)
  )
  const seatSize = Math.max(12, Math.min(32, widthBasedSeatSize, heightBasedSeatSize))

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 md:px-6">
      <section className="page-panel fade-up px-6 py-7 md:px-10">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-3">
            <div className="hero-chip">Seat Selection</div>
            <h2 className="section-title max-w-3xl">Choose the exact seats you want</h2>
            <p className="section-copy max-w-2xl">
              This layout matches the hall design created by the theatre owner, including every aisle and gap.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-sky-100 bg-sky-50/90 px-4 py-4 shadow-sm">
              <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Movie</div>
              <div className="mt-2 text-sm font-semibold text-slate-900">{showSummary.movieTitle || 'Show'}</div>
            </div>
            <div className="rounded-2xl border border-violet-100 bg-violet-50/90 px-4 py-4 shadow-sm">
              <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Venue</div>
              <div className="mt-2 text-sm font-semibold text-slate-900">
                {showSummary.theaterName || 'Theatre'}
                <span className="block text-xs font-medium text-slate-500">{showSummary.hallName || 'Hall'}</span>
              </div>
            </div>
            <div className="rounded-2xl border border-amber-100 bg-amber-50/90 px-4 py-4 shadow-sm">
              <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Showtime</div>
              <div className="mt-2 text-sm font-semibold text-slate-900">{formatShowDate(showSummary.startsAt)}</div>
            </div>
          </div>
        </div>
      </section>

      {conflictNote ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 shadow-sm">
          {conflictNote}
        </div>
      ) : null}

      <section className="page-panel overflow-hidden px-4 py-6 md:px-8">
        <div className="mb-5 flex flex-wrap items-center justify-center gap-3 text-xs font-medium text-slate-500">
          <div className="rounded-full border border-slate-200 bg-white px-4 py-2 shadow-sm">
            Tap once or drag across seats to select multiple seats together
          </div>
          <div className="rounded-full border border-slate-200 bg-white px-4 py-2 shadow-sm">
            Locked seats refresh automatically every 5 seconds
          </div>
        </div>

        <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-gradient-to-b from-white via-slate-50 to-slate-100 px-3 py-5 md:px-5">
          <div className="mx-auto flex w-full flex-col items-center">
            <div
              className="mb-3 grid items-center"
              style={{
                gridTemplateColumns: `${rowLabelWidth}px repeat(${bounds.visibleCols}, ${seatSize}px)`,
                gap,
              }}
            >
              <div style={{ width: rowLabelWidth }} />
              {Array.from({ length: bounds.visibleCols }).map((_, index) => (
                <div
                  key={`seat-col-${index}`}
                  className="text-center text-[9px] font-semibold text-slate-400 md:text-[10px]"
                  style={{ width: seatSize }}
                >
                  {index + 1}
                </div>
              ))}
            </div>

            {rows.map((row) => (
              <div
                key={row.rowIdx}
                className="mb-1.5 grid items-center"
                style={{
                  gridTemplateColumns: `${rowLabelWidth}px repeat(${bounds.visibleCols}, ${seatSize}px)`,
                  gap,
                }}
              >
                <div
                  className="text-center text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400 md:text-xs"
                  style={{ width: rowLabelWidth }}
                >
                  {row.rowLabel}
                </div>

                {row.cells.map((seat, index) => {
                  if (!seat) {
                    return <div key={`${row.rowIdx}-${index}`} style={{ width: seatSize, height: seatSize }} />
                  }

                  const isBooked = booked.has(seat.seatCode)
                  const isHeldByOther = held.has(seat.seatCode) && !heldByMe.has(seat.seatCode)
                  const isHeldByMe = heldByMe.has(seat.seatCode)
                  const isSelected = selected.has(seat.seatCode)
                  const theme = SEAT_THEME[seat.seatTypeCode] || SEAT_THEME.standard

                  let stateClass = `${theme.base} hover:-translate-y-0.5`
                  if (isBooked || isHeldByOther) {
                    stateClass = 'border-slate-300 bg-slate-300 text-slate-50 opacity-80'
                  } else if (isHeldByMe) {
                    stateClass = 'border-blue-300 bg-blue-50 text-blue-700'
                  } else if (isSelected) {
                    stateClass = 'border-slate-950 bg-slate-950 text-white shadow-[0_10px_24px_rgba(15,23,42,0.18)]'
                  } else {
                    stateClass = `${theme.highlight} hover:shadow-[0_10px_20px_rgba(148,163,184,0.18)]`
                  }

                  return (
                    <button
                      key={seat.seatCode}
                      type="button"
                      title={`${seat.displaySeatCode || seat.seatCode} • ${(seatTypeMap.get(seat.seatTypeCode)?.displayName || theme.label)}`}
                      disabled={isBooked || isHeldByOther}
                      onPointerDown={(event) => {
                        event.preventDefault()
                        startDrag(seat.seatCode)
                      }}
                      onPointerEnter={() => {
                        if (!dragMode) return
                        applySeatChoice(seat.seatCode, dragMode.shouldSelect)
                      }}
                      className={`flex items-center justify-center rounded-[0.7rem] border text-[9px] font-semibold transition-all duration-150 md:text-[10px] ${stateClass}`}
                      style={{ width: seatSize, height: seatSize }}
                    />
                  )
                })}
              </div>
            ))}

            <div className="mt-6 w-full max-w-4xl text-center">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-400">
                Screen This Side
              </div>
              <div className="mx-auto h-18 w-full rounded-[100%] border border-sky-100 bg-gradient-to-b from-sky-100 via-blue-50 to-white shadow-[0_18px_40px_rgba(96,165,250,0.18)]" />
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          {(data.seatTypes || []).map((seatType) => {
            const theme = SEAT_THEME[seatType.code] || SEAT_THEME.standard
            return (
              <div key={seatType.code} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-600 shadow-sm">
                <span className={`mr-2 inline-block h-3 w-3 rounded-full border ${theme.highlight}`} />
                {seatType.displayName} • ₹{Number(seatType.price || 0)}
              </div>
            )
          })}
          <div className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-600 shadow-sm">
            <span className="mr-2 inline-block h-3 w-3 rounded-full bg-slate-950 align-middle" />
            Selected
          </div>
          <div className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-600 shadow-sm">
            <span className="mr-2 inline-block h-3 w-3 rounded-full border border-blue-300 bg-blue-50 align-middle" />
            Held by you
          </div>
          <div className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-600 shadow-sm">
            <span className="mr-2 inline-block h-3 w-3 rounded-full bg-slate-300 align-middle" />
            Booked or temporarily locked
          </div>
        </div>
      </section>

      <section className="page-panel px-6 py-7 md:px-8">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Selected seats</div>
              <div className="mt-2 rounded-2xl border border-slate-200 bg-white/90 px-4 py-4 font-mono text-sm text-slate-900 shadow-sm">
                {selectedDisplayArr.join(', ') || 'No seats selected'}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {seatStats.length ? (
                seatStats.map((item) => (
                  <div key={item.code} className="rounded-2xl border border-slate-200 bg-white/85 px-4 py-4 shadow-sm">
                    <div className="text-xs uppercase tracking-[0.18em] text-slate-400">{item.label}</div>
                    <div className="mt-2 text-lg font-semibold text-slate-950">{item.count} seat(s)</div>
                    <div className="mt-1 text-sm text-slate-500">₹{item.price} each</div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white/70 px-4 py-5 text-sm text-slate-500">
                  Choose seats to see the ticket summary.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-slate-200 bg-[linear-gradient(160deg,rgba(15,23,42,0.96),rgba(30,41,59,0.94),rgba(30,64,175,0.84))] p-5 text-white shadow-[0_24px_60px_rgba(15,23,42,0.22)]">
            <div className="text-xs uppercase tracking-[0.2em] text-blue-100/80">Booking summary</div>
            <div className="mt-4 text-3xl font-semibold">{selectedArr.length}</div>
            <div className="text-sm text-blue-100/80">seat(s) selected</div>

            <div className="mt-6 space-y-3 border-t border-white/10 pt-5 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-blue-100/80">Hall</span>
                <span className="font-medium">{showSummary.hallName || 'Hall'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-blue-100/80">Showtime</span>
                <span className="text-right font-medium">{formatShowDate(showSummary.startsAt)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-blue-100/80">Total</span>
                <span className="text-xl font-semibold">₹{totalAmount}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={proceed}
              disabled={selectedArr.length === 0 || loadingHold}
              className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-white px-5 py-3.5 text-sm font-semibold text-slate-950 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loadingHold ? 'Locking seats...' : 'Proceed to payment'}
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
