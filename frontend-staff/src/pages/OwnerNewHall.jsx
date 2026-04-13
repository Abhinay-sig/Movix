// import { useMemo, useRef, useState } from 'react'
// import { api } from '../lib/api'
// import { useAuth } from '../AuthContext'
// import { segmentsFromSelected, typedSegmentsFromMaps } from '../lib/layoutEncode'

// const ROWS = 50
// const COLS = 80

// const SEAT_TYPES = [
//   { code: 'standard', label: 'Standard' },
//   { code: 'premium', label: 'Premium' },
//   { code: 'recliner', label: 'Recliner' },
//   { code: 'vip', label: 'VIP' },
// ]

// export default function OwnerNewHall() {
//   const { auth } = useAuth()
//   const [theaterId, setTheaterId] = useState('')
//   const [hallName, setHallName] = useState('')
//   const [activeType, setActiveType] = useState('standard')
//   const [err, setErr] = useState('')
//   const [saving, setSaving] = useState(false)

//   const [selected, setSelected] = useState(() => new Set()) // all seats
//   const typeByCellRef = useRef(new Map()) // "r:c" => type

//   const [drag, setDrag] = useState(null) // {startR,startC,endR,endC}
//   const gridRef = useRef(null)

//   const cellSize = 10

//   function cellFromEvent(e) {
//     const el = gridRef.current
//     if (!el) return null
//     const rect = el.getBoundingClientRect()
//     const x = e.clientX - rect.left
//     const y = e.clientY - rect.top
//     const c = Math.floor(x / (cellSize + 2))
//     const r = Math.floor(y / (cellSize + 2))
//     if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return null
//     return { r, c }
//   }

//   function applyRectToSelection(r0, c0, r1, c1) {
//     const rMin = Math.min(r0, r1)
//     const rMax = Math.max(r0, r1)
//     const cMin = Math.min(c0, c1)
//     const cMax = Math.max(c0, c1)
//     setSelected((prev) => {
//       const next = new Set(prev)
//       for (let r = rMin; r <= rMax; r++) {
//         for (let c = cMin; c <= cMax; c++) {
//           const k = `${r}:${c}`
//           next.add(k)
//           typeByCellRef.current.set(k, activeType)
//         }
//       }
//       return next
//     })
//   }

//   function onPointerDown(e) {
//     const cell = cellFromEvent(e)
//     if (!cell) return
//     e.currentTarget.setPointerCapture?.(e.pointerId)
//     setDrag({ startR: cell.r, startC: cell.c, endR: cell.r, endC: cell.c })
//   }

//   function onPointerMove(e) {
//     if (!drag) return
//     const cell = cellFromEvent(e)
//     if (!cell) return
//     setDrag((d) => ({ ...d, endR: cell.r, endC: cell.c }))
//   }

//   function onPointerUp() {
//     if (!drag) return
//     applyRectToSelection(drag.startR, drag.startC, drag.endR, drag.endC)
//     setDrag(null)
//   }

//   function clearAll() {
//     setSelected(new Set())
//     typeByCellRef.current = new Map()
//   }

//   const previewRect = useMemo(() => {
//     if (!drag) return null
//     const rMin = Math.min(drag.startR, drag.endR)
//     const rMax = Math.max(drag.startR, drag.endR)
//     const cMin = Math.min(drag.startC, drag.endC)
//     const cMax = Math.max(drag.startC, drag.endC)
//     return { rMin, rMax, cMin, cMax }
//   }, [drag])

//   async function save() {
//     setErr('')
//     if (!theaterId || !hallName) {
//       setErr('theaterId and hall name are required')
//       return
//     }
//     if (selected.size === 0) {
//       setErr('Select at least 1 seat in the grid')
//       return
//     }
//     setSaving(true)
//     try {
//       const segmentsByRow = segmentsFromSelected(selected, ROWS, COLS)
//       const typedSegmentsByRow = typedSegmentsFromMaps(typeByCellRef.current, ROWS, COLS)
//       await api('/owner/halls', {
//         method: 'POST',
//         token: auth.token,
//         body: { theaterId: Number(theaterId), name: hallName, segmentsByRow, typedSegmentsByRow },
//       })
//       alert('Hall submitted for admin approval.')
//       setTheaterId('')
//       setHallName('')
//       clearAll()
//     } catch (e) {
//       setErr(e.message)
//     } finally {
//       setSaving(false)
//     }
//   }

//   return (
//     <div>
//       <h2 className="text-4xl font-bold text-white mb-8">Add hall (layout builder)</h2>
//       <div className="space-y-6">
//         <div className="bg-white rounded-xl shadow-lg p-8 max-w-2xl">
//           <form className="space-y-4">
//             <input
//               placeholder="theaterId (from Theaters page)"
//               value={theaterId}
//               onChange={(e) => setTheaterId(e.target.value)}
//               className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
//             />
//             <input placeholder="Hall name" value={hallName} onChange={(e) => setHallName(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            
//             <div>
//               <label className="text-gray-700 font-medium mb-3 block">Seat type for selection:</label>
//               <div className="flex flex-wrap gap-2">
//                 {SEAT_TYPES.map((t) => (
//                   <button key={t.code} onClick={() => setActiveType(t.code)} disabled={activeType === t.code} className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeType === t.code ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>
//                     {t.label}
//                   </button>
//                 ))}
//                 <button onClick={clearAll} className="px-4 py-2 bg-gray-400 hover:bg-gray-500 text-white rounded-lg font-medium transition-colors">Clear</button>
//               </div>
//             </div>
            
//             <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
//               Drag-select rectangles to place seats. Each drag assigns the currently selected seat type.
//             </div>
//           </form>
//         </div>

//         {err ? <div className="text-red-400 bg-red-900/20 p-4 rounded-lg border border-red-900">{err}</div> : null}

//         <div className="bg-white rounded-xl shadow-lg p-6 overflow-auto max-w-fit">
//           <div
//             ref={gridRef}
//             onPointerDown={onPointerDown}
//             onPointerMove={onPointerMove}
//             onPointerUp={onPointerUp}
//             style={{
//               position: 'relative',
//               display: 'grid',
//               gridTemplateColumns: `repeat(${COLS}, ${cellSize}px)`,
//               gridTemplateRows: `repeat(${ROWS}, ${cellSize}px)`,
//               gap: 2,
//               width: COLS * (cellSize + 2),
//               userSelect: 'none',
//               touchAction: 'none',
//             }}
//           >
//             {Array.from({ length: ROWS * COLS }).map((_, idx) => {
//               const r = Math.floor(idx / COLS)
//               const c = idx % COLS
//               const k = `${r}:${c}`
//               const isSeat = selected.has(k)
//               const type = typeByCellRef.current.get(k)
//               const bg = isSeat ? '#1f2937' : '#fff'
//               const border = isSeat ? '1px solid #1f2937' : '1px solid #d1d5db'
//               return <div key={idx} style={{ width: cellSize, height: cellSize, background: bg, border, opacity: 1 }} />
//             })}

//             {previewRect ? (
//               <div
//                 style={{
//                   position: 'absolute',
//                   left: previewRect.cMin * (cellSize + 2),
//                   top: previewRect.rMin * (cellSize + 2),
//                   width: (previewRect.cMax - previewRect.cMin + 1) * (cellSize + 2) - 2,
//                   height: (previewRect.rMax - previewRect.rMin + 1) * (cellSize + 2) - 2,
//                   outline: '2px solid #2563eb',
//                   background: 'rgba(37,99,235,0.1)',
//                   pointerEvents: 'none',
//                 }}
//               />
//             ) : null}
//           </div>
//         </div>

//         <div className="bg-white rounded-xl shadow-lg p-6 max-w-2xl flex items-center justify-between">
//           <div className="text-lg font-semibold text-gray-900">Selected seats: <span className="text-blue-600">{selected.size}</span></div>
//           <button onClick={save} disabled={saving} className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-colors disabled:opacity-50">
//             {saving ? 'Saving…' : 'Save & request approval'}
//           </button>
//         </div>
//       </div>
//     </div>
//   )
// }



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

export default function OwnerNewHall() {
  const { auth } = useAuth()
  const { showNotification } = useNotification()
  const [theaters, setTheaters] = useState([])
  const [theaterId, setTheaterId] = useState('')
  const [hallName, setHallName] = useState('')
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
      const typedSegmentsByRow = typedSegmentsFromMaps(
        typeByCellRef.current,
        ROWS,
        COLS
      )

      await api('/owner/halls', {
        method: 'POST',
        token: auth.token,
        body: {
          theaterId: Number(theaterId),
          name: hallName,
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
        <h2 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
          Design hall layout
        </h2>
        <p className="text-sm text-slate-500">
          Each theater can have multiple halls. Choose a theater, then design one hall layout.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
          <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">
                Theater
              </label>
              <select
                value={theaterId}
                onChange={(e) => setTheaterId(e.target.value)}
                className={fieldClass}
              >
                <option value="">Choose a theater…</option>
                {theaters.map((theater) => (
                  <option key={theater.id} value={theater.id}>
                    {theater.name} • {theater.city}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">
                Hall name
              </label>
              <input
                placeholder="Enter hall name"
                value={hallName}
                onChange={(e) => setHallName(e.target.value)}
                className={fieldClass}
              />
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-700">
                Seating style
              </label>

              <div className="flex flex-wrap gap-2">
                {SEAT_TYPES.map((t) => (
                  <button
                    key={t.code}
                    type="button"
                    onClick={() => setActiveType(t.code)}
                    className={typeButtonClass(activeType === t.code)}
                  >
                    {t.label}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={clearAll}
                  className="rounded-full bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 transition-all duration-200 hover:bg-rose-100 hover:text-rose-800"
                >
                  Clear all
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-slate-600">
              Drag across the grid to place seats for this hall. Each theater can contain multiple halls with different layouts.
            </div>
          </form>

          {err ? (
            <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {err}
            </div>
          ) : null}

          {theaters.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              Add a theater first in the Theaters tab before creating halls.
            </div>
          ) : null}
        </div>

        <div className="space-y-5">
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <div className="text-sm font-medium text-slate-700">
                Selected seats:{' '}
                <span className="font-semibold text-slate-900">{selected.size}</span>
              </div>

              <div className="flex flex-wrap gap-2">
                {SEAT_TYPES.map((t) => (
                  <div
                    key={t.code}
                    className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600"
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: SEAT_COLORS[t.code] }}
                    />
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

                  return (
                    <div
                      key={idx}
                      style={{
                        width: cellSize,
                        height: cellSize,
                        background: bg,
                        border,
                        borderRadius: 2,
                        transition: 'transform 120ms ease, opacity 120ms ease',
                      }}
                    />
                  )
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
              <div className="mt-1 text-lg font-semibold text-slate-900">
                {selected.size} seats arranged
              </div>
            </div>

            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-blue-600 hover:shadow-md active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Publish layout'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
