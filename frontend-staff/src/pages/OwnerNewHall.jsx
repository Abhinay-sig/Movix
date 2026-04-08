import { useMemo, useRef, useState } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../AuthContext'
import { segmentsFromSelected, typedSegmentsFromMaps } from '../lib/layoutEncode'

const ROWS = 50
const COLS = 80

const SEAT_TYPES = [
  { code: 'standard', label: 'Standard' },
  { code: 'premium', label: 'Premium' },
  { code: 'recliner', label: 'Recliner' },
  { code: 'vip', label: 'VIP' },
]

const SCREEN_TYPES = ['2D', '3D', 'IMAX']

const FACILITY_OPTIONS = [
  'AC',
  'Dolby Atmos',
  'Recliner',
  'Food Court',
  'Wheelchair Access',
  'Parking',
]

export default function OwnerNewHall() {
  const { auth } = useAuth()
  const [theaterId, setTheaterId] = useState('')
  const [hallName, setHallName] = useState('')
  const [screenType, setScreenType] = useState('')
  const [facilities, setFacilities] = useState([])
  const [imageUrls, setImageUrls] = useState('')
  const [activeType, setActiveType] = useState('standard')
  const [err, setErr] = useState('')
  const [saving, setSaving] = useState(false)

  const [selected, setSelected] = useState(() => new Set()) // all seats
  const typeByCellRef = useRef(new Map()) // "r:c" => type

  const [drag, setDrag] = useState(null) // {startR,startC,endR,endC}
  const gridRef = useRef(null)

  const cellSize = 10

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
      setErr('theaterId and hall name are required')
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
      alert('Hall submitted for admin approval.')
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

  return (
    <div>
      <h2 className="text-4xl font-bold text-white mb-8">Add hall (layout builder)</h2>
      <div className="space-y-6">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-2xl">
          <form className="space-y-4">
            <input
              placeholder="theaterId (from Theaters page)"
              value={theaterId}
              onChange={(e) => setTheaterId(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input placeholder="Hall name" value={hallName} onChange={(e) => setHallName(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />

            <div>
              <label className="text-gray-700 font-medium mb-2 block">Screen type</label>
              <select value={screenType} onChange={(e) => setScreenType(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select screen type</option>
                {SCREEN_TYPES.map((st) => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-gray-700 font-medium mb-2 block">Facilities</label>
              <div className="grid grid-cols-2 gap-2">
                {FACILITY_OPTIONS.map((f) => (
                  <label key={f} className="flex items-center gap-2 text-sm text-gray-700">
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

            <div>
              <label className="text-gray-700 font-medium mb-2 block">Image URLs (one per line)</label>
              <textarea
                rows={3}
                value={imageUrls}
                onChange={(e) => setImageUrls(e.target.value)}
                placeholder="https://example.com/hall1.jpg"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="text-gray-700 font-medium mb-3 block">Seat type for selection:</label>
              <div className="flex flex-wrap gap-2">
                {SEAT_TYPES.map((t) => (
                  <button key={t.code} onClick={() => setActiveType(t.code)} disabled={activeType === t.code} className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeType === t.code ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>
                    {t.label}
                  </button>
                ))}
                <button onClick={clearAll} className="px-4 py-2 bg-gray-400 hover:bg-gray-500 text-white rounded-lg font-medium transition-colors">Clear</button>
              </div>
            </div>
            
            <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
              Drag-select rectangles to place seats. Each drag assigns the currently selected seat type.
            </div>
          </form>
        </div>

        {err ? <div className="text-red-400 bg-red-900/20 p-4 rounded-lg border border-red-900">{err}</div> : null}

        <div className="bg-white rounded-xl shadow-lg p-6 overflow-auto max-w-fit">
          <div
            ref={gridRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
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
              const bg = isSeat ? '#1f2937' : '#fff'
              const border = isSeat ? '1px solid #1f2937' : '1px solid #d1d5db'
              return <div key={idx} style={{ width: cellSize, height: cellSize, background: bg, border, opacity: 1 }} />
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
                  background: 'rgba(37,99,235,0.1)',
                  pointerEvents: 'none',
                }}
              />
            ) : null}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 max-w-2xl flex items-center justify-between">
          <div className="text-lg font-semibold text-gray-900">Selected seats: <span className="text-blue-600">{selected.size}</span></div>
          <button onClick={save} disabled={saving} className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-colors disabled:opacity-50">
            {saving ? 'Saving…' : 'Save & request approval'}
          </button>
        </div>
      </div>
    </div>
  )
}
