import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../AuthContext'
import { hasSeat, seatCode } from '../lib/seatLayout'

export default function SeatSelect() {
  const { auth } = useAuth()
  const { showId } = useParams()
  const nav = useNavigate()

  const [data, setData] = useState(null)
  const [err, setErr] = useState('')
  const [selected, setSelected] = useState(() => new Set())
  const selectedArr = useMemo(() => Array.from(selected), [selected])

  useEffect(() => {
    let alive = true
    api(`/public/shows/${showId}/seatmap`)
      .then((d) => alive && setData(d))
      .catch((e) => alive && setErr(e.message))
    return () => {
      alive = false
    }
  }, [showId])

  const booked = useMemo(() => new Set(data?.bookedSeats || []), [data])
  const held = useMemo(() => new Set(data?.heldSeats || []), [data])

  function toggle(seat) {
    if (booked.has(seat) || held.has(seat)) return
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(seat)) next.delete(seat)
      else {
        if (next.size >= 10) {
          alert('You can select max 10 seats.')
          return prev
        }
        next.add(seat)
      }
      return next
    })
  }

  async function proceed() {
    if (selected.size < 1) {
      alert('Select at least 1 seat.')
      return
    }
    // create hold first, then go to payment
    try {
      const hold = await api('/holds', {
        method: 'POST',
        token: auth.token,
        body: { showId: Number(showId), seatCodes: selectedArr },
      })
      nav(`/shows/${showId}/payment`, { state: { seatCodes: selectedArr, expiresAt: hold.expiresAt } })
    } catch (e) {
      alert(e.message)
      // refresh seatmap
      api(`/public/shows/${showId}/seatmap`).then(setData).catch(() => {})
    }
  }

  if (err) return <div className="text-red-400 bg-red-900/20 p-4 rounded-lg border border-red-900">{err}</div>
  if (!data) return <div className="text-gray-300 text-lg">Loading…</div>

  const rows = data.layout.rows
  const cols = data.layout.cols
  const segmentsByRow = data.layout.segmentsByRow

  return (
    <div className="space-y-6">
      <h2 className="text-4xl font-bold text-white mb-8">Select your seats</h2>
      <div className="bg-white rounded-xl shadow-lg p-8">
        <div className="mb-6 p-4 bg-blue-50 rounded-lg border-l-4 border-blue-600">
          <div className="text-sm text-gray-700 space-y-2">
            <div><span className="inline-block w-4 h-4 bg-white border border-gray-300 rounded mr-2"></span>Available</div>
            <div><span className="inline-block w-4 h-4 bg-gray-400 rounded mr-2"></span>Booked / Held</div>
            <div><span className="inline-block w-4 h-4 bg-blue-600 rounded mr-2"></span>Selected by you</div>
          </div>
        </div>

        <div className="overflow-auto p-6 bg-gray-50 rounded-lg border border-gray-200">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${cols}, 16px)`,
              gap: 2,
              width: cols * 18,
            }}
          >
            {Array.from({ length: rows * cols }).map((_, idx) => {
              const r = Math.floor(idx / cols)
              const c = idx % cols
              if (!hasSeat(segmentsByRow, r, c)) {
                return <div key={idx} style={{ width: 14, height: 14 }} />
              }
              const code = seatCode(r, c)
              const isDisabled = booked.has(code) || held.has(code)
              const isSel = selected.has(code)
              const bg = isDisabled ? '#9ca3af' : isSel ? '#2563eb' : '#fff'
              return (
                <button
                  key={idx}
                  onClick={() => toggle(code)}
                  title={code}
                  style={{
                    width: 14,
                    height: 14,
                    padding: 0,
                    borderRadius: 3,
                    border: '1px solid #999',
                    background: bg,
                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                  }}
                  disabled={isDisabled}
                  className="hover:scale-110 transition-transform"
                />
              )
            })}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-8">
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div className="text-lg font-semibold text-gray-900">
              Selected seats: <span className="text-blue-600">{selected.size}</span>
            </div>
            <div className="mt-3 sm:mt-0">
              <div className="text-sm text-gray-600 mb-2">Your selection:</div>
              <div className="font-mono text-sm font-medium text-gray-900 bg-gray-50 p-2 rounded border border-gray-300">
                {selectedArr.sort().join(', ') || 'No seats selected'}
              </div>
            </div>
          </div>
          <button onClick={proceed} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-50" disabled={selected.size === 0}>
            Proceed to payment
          </button>
        </div>
      </div>
    </div>
  )
}

