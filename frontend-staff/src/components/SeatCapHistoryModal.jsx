import { useEffect, useState } from 'react'
import { api } from '../lib/api'

export default function SeatCapHistoryModal({ open, hallId, token, onClose }) {
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [data, setData] = useState(null)

  useEffect(() => {
    if (!open || !hallId || !token) return
    setLoading(true)
    setErr('')
    setData(null)
    api(`/admin/halls/${hallId}/cap-history`, { token })
      .then(setData)
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false))
  }, [open, hallId, token])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-white rounded-xl shadow-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-xl font-bold text-gray-900">Seat Cap History</h3>
          <button onClick={onClose} className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 text-gray-800">
            Close
          </button>
        </div>

        <div className="p-6 max-h-[70vh] overflow-auto space-y-4">
          {err ? <div className="text-red-600 bg-red-50 border border-red-200 p-3 rounded-lg">{err}</div> : null}
          {loading ? <div className="text-gray-600">Loading history…</div> : null}

          {!loading && data ? (
            <>
              <div className="text-gray-700">
                <span className="font-semibold">Hall:</span> {data.hall?.hallName} ({data.hall?.theaterName || '—'})
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border border-gray-200 rounded-lg overflow-hidden">
                  <thead className="bg-gray-100 text-gray-700">
                    <tr>
                      <th className="px-4 py-3">Time</th>
                      <th className="px-4 py-3">Seat Type</th>
                      <th className="px-4 py-3">Old Cap</th>
                      <th className="px-4 py-3">New Cap</th>
                      <th className="px-4 py-3">Changed By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.history || []).map((h) => (
                      <tr key={h.id} className="border-t border-gray-200">
                        <td className="px-4 py-3">{new Date(h.createdAt).toLocaleString()}</td>
                        <td className="px-4 py-3 capitalize">{h.seatType}</td>
                        <td className="px-4 py-3">{h.oldCap == null ? '—' : `₹${h.oldCap}`}</td>
                        <td className="px-4 py-3 font-semibold text-green-700">₹{h.newCap}</td>
                        <td className="px-4 py-3">{h.changedBy}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {(data.history || []).length === 0 ? <div className="text-gray-600">No cap changes recorded yet.</div> : null}
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}

