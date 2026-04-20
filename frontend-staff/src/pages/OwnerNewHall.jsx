import { useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../useAuth'
import { useNotification } from '../NotificationProvider'
import { segmentsFromSelected, typedSegmentsFromMaps } from '../lib/layoutEncode'

const ROWS = 50
const COLS = 80

const SEAT_TYPES = [
  { code: 'standard', label: 'Standard' },
  { code: 'premium', label: 'Premium' },
  { code: 'recliner', label: 'Recliner' },
  { code: 'vip', label: 'VIP' },
]

const SEAT_COLORS = {
  standard: '#0f172a',
  premium: '#2563eb',
  recliner: '#10b981',
  vip: '#f59e0b',
}

const SCREEN_TYPES = ['2D', '3D', 'IMAX']
const FACILITY_OPTIONS = ['AC', 'Dolby Atmos', 'Recliner', 'Wheelchair Access']

export default function OwnerNewHall() {
  const { auth } = useAuth()
  const { showNotification } = useNotification()
  const [theaters, setTheaters] = useState([])
  const [theaterId, setTheaterId] = useState('')
  const [hallName, setHallName] = useState('')
  const [screenType, setScreenType] = useState('')
  const [facilities, setFacilities] = useState([])
  const [imageUrls, setImageUrls] = useState('')
  const [activeType, setActiveType] = useState('standard')
  const [err, setErr] = useState('')
  const [saving, setSaving] = useState(false)

  const [selected, setSelected] = useState(() => new Set())
  const typeByCellRef = useRef(new Map())

  const [drag, setDrag] = useState(null)
  const gridRef = useRef(null)

  const cellSize = 10

  useEffect(() => {
    api('/owner/me/theaters', { token: auth.token })
      .then((response) => setTheaters(response.theaters || []))
      .catch((e) => setErr(e.message))
  }, [auth.token])

  const approvedTheaters = theaters.filter((t) => !t.isBlocked)

  function cellFromEvent(e) {
    const el = gridRef.current
    if (!el) return null
    const rect = el.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const c = Math.floor(x / (cellSize + 2))
    const r = Math.floor(y / (cellSize + 2))
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return null
    return { r, c }
  }

  function applyRectToSelection(r0, c0, r1, c1) {
    const rMin = Math.min(r0, r1)
    const rMax = Math.max(r0, r1)
    const cMin = Math.min(c0, c1)
    const cMax = Math.max(c0, c1)

    setSelected((prev) => {
      const next = new Set(prev)
      for (let r = rMin; r <= rMax; r++) {
        for (let c = cMin; c <= cMax; c++) {
          const k = `${r}:${c}`
          next.add(k)
          typeByCellRef.current.set(k, activeType)
        }
      }
      return next
    })
  }

  function onPointerDown(e) {
    const cell = cellFromEvent(e)
    if (!cell) return
    e.currentTarget.setPointerCapture?.(e.pointerId)
    setDrag({ startR: cell.r, startC: cell.c, endR: cell.r, endC: cell.c })
  }

  function onPointerMove(e) {
    if (!drag) return
    const cell = cellFromEvent(e)
    if (!cell) return
    setDrag((d) => ({ ...d, endR: cell.r, endC: cell.c }))
  }

  function onPointerUp() {
    if (!drag) return
    applyRectToSelection(drag.startR, drag.startC, drag.endR, drag.endC)
    setDrag(null)
  }

  function clearAll() {
    setSelected(new Set())
    typeByCellRef.current = new Map()
  }

  const previewRect = useMemo(() => {
    if (!drag) return null
    const rMin = Math.min(drag.startR, drag.endR)
    const rMax = Math.max(drag.startR, drag.endR)
    const cMin = Math.min(drag.startC, drag.endC)
    const cMax = Math.max(drag.startC, drag.endC)
    return { rMin, rMax, cMin, cMax }
  }, [drag])

  async function save() {
    setErr('')
    if (!theaterId || !hallName) {
      setErr('Please choose a theater and enter a hall name to continue.')
      return
    }
    if (selected.size === 0) {
      setErr('Select at least 1 seat in the grid')
      return
    }

    setSaving(true)
    try {
      const segmentsByRow = segmentsFromSelected(selected, ROWS, COLS)
      const typedSegmentsByRow = typedSegmentsFromMaps(typeByCellRef.current, ROWS, COLS)
      const images = imageUrls
        .split('\n')
        .map((x) => x.trim())
        .filter(Boolean)

      await api('/owner/halls', {
        method: 'POST',
        token: auth.token,
        body: {
          theaterId: Number(theaterId),
          name: hallName,
          screenType: screenType || undefined,
          facilities: facilities.length ? facilities : undefined,
          images: images.length ? images : undefined,
          segmentsByRow,
          typedSegmentsByRow,
        },
      })

      showNotification({
        title: 'Hall created',
        message: 'The hall is ready and can now be used while creating shows.',
        type: 'success',
      })
      setTheaterId('')
      setHallName('')
      setScreenType('')
      setFacilities([])
      setImageUrls('')
      clearAll()
    } catch (e) {
      setErr(e.message)
    } finally {
      setSaving(false)
    }
  }

  const fieldClass =
    'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100'

  const typeButtonClass = (active) =>
    `rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 ${
      active
        ? 'bg-slate-900 text-white shadow-sm'
        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
    }`

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">Design hall layout</h2>
        <p className="text-sm text-slate-500">Each theater can have multiple halls. Choose a theater, then design one hall layout.</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
          <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">Theater</label>
              <select value={theaterId} onChange={(e) => setTheaterId(e.target.value)} className={fieldClass}>
                <option value="">Choose a theater…</option>
                {approvedTheaters.map((theater) => (
                  <option key={theater.id} value={theater.id}>{theater.name} • {theater.city}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">Hall name</label>
              <input placeholder="Enter hall name" value={hallName} onChange={(e) => setHallName(e.target.value)} className={fieldClass} />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">Screen type</label>
              <select value={screenType} onChange={(e) => setScreenType(e.target.value)} className={fieldClass}>
                <option value="">Select screen type</option>
                {SCREEN_TYPES.map((st) => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">Facilities</label>
              <div className="grid grid-cols-2 gap-2">
                {FACILITY_OPTIONS.map((f) => (
                  <label key={f} className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={facilities.includes(f)}
                      onChange={(e) => {
                        if (e.target.checked) setFacilities((prev) => Array.from(new Set([...prev, f])))
                        else setFacilities((prev) => prev.filter((x) => x !== f))
                      }}
                    />
                    {f}
                  </label>
                ))}
              </div>
            </div>

            {/* <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">Image URLs (one per line)</label>
              <textarea rows={3} value={imageUrls} onChange={(e) => setImageUrls(e.target.value)} placeholder="https://example.com/hall1.jpg" className={fieldClass} />
            </div> */}

            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-700">Seating style</label>
              <div className="flex flex-wrap gap-2">
                {SEAT_TYPES.map((t) => (
                  <button key={t.code} type="button" onClick={() => setActiveType(t.code)} className={typeButtonClass(activeType === t.code)}>{t.label}</button>
                ))}
                <button type="button" onClick={clearAll} className="rounded-full bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 transition-all duration-200 hover:bg-rose-100 hover:text-rose-800">Clear all</button>
              </div>
            </div>

            <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-slate-600">
              Drag across the grid to place seats for this hall. Each theater can contain multiple halls with different layouts.
            </div>
          </form>

          {err ? <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{err}</div> : null}
          {approvedTheaters.length === 0 ? <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">Add a theater first in the Theaters tab before creating halls.</div> : null}
        </div>

        <div className="space-y-5">
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <div className="text-sm font-medium text-slate-700">Selected seats: <span className="font-semibold text-slate-900">{selected.size}</span></div>
              <div className="flex flex-wrap gap-2">
                {SEAT_TYPES.map((t) => (
                  <div key={t.code} className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: SEAT_COLORS[t.code] }} />
                    {t.label}
                  </div>
                ))}
              </div>
            </div>

            <div className="overflow-auto rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <div
                ref={gridRef}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                style={{
                  position: 'relative',
                  display: 'grid',
                  gridTemplateColumns: `repeat(${COLS}, ${cellSize}px)`,
                  gridTemplateRows: `repeat(${ROWS}, ${cellSize}px)`,
                  gap: 2,
                  width: COLS * (cellSize + 2),
                  userSelect: 'none',
                  touchAction: 'none',
                }}
              >
                {Array.from({ length: ROWS * COLS }).map((_, idx) => {
                  const r = Math.floor(idx / COLS)
                  const c = idx % COLS
                  const k = `${r}:${c}`
                  const isSeat = selected.has(k)
                  const type = typeByCellRef.current.get(k)
                  const bg = isSeat ? SEAT_COLORS[type || 'standard'] : '#ffffff'
                  const border = isSeat ? `1px solid ${SEAT_COLORS[type || 'standard']}` : '1px solid #e2e8f0'

                  return <div key={idx} style={{ width: cellSize, height: cellSize, background: bg, border, borderRadius: 2, transition: 'transform 120ms ease, opacity 120ms ease' }} />
                })}

                {previewRect ? (
                  <div
                    style={{
                      position: 'absolute',
                      left: previewRect.cMin * (cellSize + 2),
                      top: previewRect.rMin * (cellSize + 2),
                      width: (previewRect.cMax - previewRect.cMin + 1) * (cellSize + 2) - 2,
                      height: (previewRect.rMax - previewRect.rMin + 1) * (cellSize + 2) - 2,
                      outline: '2px solid #2563eb',
                      background: 'rgba(37, 99, 235, 0.08)',
                      borderRadius: 6,
                      pointerEvents: 'none',
                    }}
                  />
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div>
              <div className="text-sm text-slate-500">Current layout</div>
              <div className="mt-1 text-lg font-semibold text-slate-900">{selected.size} seats arranged</div>
            </div>

            <button type="button" onClick={save} disabled={saving} className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-blue-600 hover:shadow-md active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50">
              {saving ? 'Saving…' : 'Publish layout'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
