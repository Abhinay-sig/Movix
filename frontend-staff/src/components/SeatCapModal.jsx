import { useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api'

export default function SeatCapModal({ open, hallId, token, mode = 'approve', onClose, onApproved }) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const [hall, setHall] = useState(null)
  const [caps, setCaps] = useState({})
  const [suggested, setSuggested] = useState({})

  useEffect(() => {
    if (!open || !hallId || !token) return
    setLoading(true)
    setErr('')
    setHall(null)
    setCaps({})
    setSuggested({})

    const detailsPath = mode === 'edit' ? `/admin/halls/${hallId}/caps` : `/admin/halls/pending/${hallId}`
    Promise.all([
      api(detailsPath, { token }),
      api(`/admin/halls/${hallId}/suggested-caps`, { token }).catch(() => null),
    ])
      .then(([d, s]) => {
        setHall(d)
        const suggestionMap = {}
        for (const row of s?.seatCaps || []) {
          suggestionMap[row.seatType] = row.suggestedCap
        }
        setSuggested(suggestionMap)

        const initial = {}
        for (const st of d.seatTypes || []) {
          const existingCap = st.adminPriceCap
          const suggestedCap = suggestionMap[st.type]
          const val = existingCap != null ? existingCap : suggestedCap
          initial[st.type] = val != null ? String(val) : ''
        }
        setCaps(initial)
      })
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false))
  }, [open, hallId, token, mode])

  const seatTypes = useMemo(() => hall?.seatTypes || [], [hall])

  async function submit() {
    setErr('')
    const missing = seatTypes.find((st) => !String(caps[st.type] ?? '').trim())
    if (missing) {
      setErr('Please enter price cap for all seat types')
      return
    }

    const seatCaps = seatTypes.map((st) => ({
      seatType: st.type,
      priceCap: Number(caps[st.type]),
    }))
    if (seatCaps.some((x) => !Number.isFinite(x.priceCap) || x.priceCap <= 0)) {
      setErr('All price caps must be valid positive numbers')
      return
    }

    setSaving(true)
    try {
      const path = mode === 'edit' ? `/admin/halls/${hallId}/caps` : `/admin/halls/${hallId}/approve`
      const method = mode === 'edit' ? 'PUT' : 'POST'
      await api(path, { method, token, body: { seatCaps } })
      onApproved?.()
      onClose?.()
    } catch (e) {
      setErr(e.message)
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 mt-40">
      <div className="w-full max-w-3xl bg-white rounded-xl shadow-2xl overflow-hidden border border-gray-300">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-xl font-bold text-gray-900">
            {mode === 'edit' ? 'Edit Seat Caps' : 'Approve Hall With Seat Caps'}
          </h3>
          <button onClick={onClose} className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 text-gray-800">
            Close
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[70vh] overflow-auto">
          {err ? <div className="text-red-600 bg-red-50 border border-red-200 p-3 rounded-lg">{err}</div> : null}
          {loading ? <div className="text-gray-600">Loading seat types…</div> : null}

          {!loading && hall ? (
            <>
              <div className="text-gray-700">
                <span className="font-semibold">Hall:</span> {hall.hallName} ({hall.theaterName})
              </div>
              {Object.keys(suggested).length ? (
                <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                  <div className="text-sm font-semibold text-blue-900 mb-2">Suggested Caps</div>
                  <div className="flex flex-wrap gap-2 text-sm">
                    {seatTypes.map((st) => (
                      <span key={st.type} className="px-2 py-1 rounded bg-white border border-blue-200 text-blue-900">
                        {st.displayName || st.type}: ₹{suggested[st.type] ?? '—'}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
              <div className="overflow-x-auto">
                <table className="w-full text-left border border-gray-200 rounded-lg overflow-hidden">
                  <thead className="bg-gray-100 text-gray-700">
                    <tr>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Count</th>
                      <th className="px-4 py-3">Admin Price Cap</th>
                    </tr>
                  </thead>
                  <tbody>
                    {seatTypes.map((st) => (
                      <tr key={st.type} className="border-t border-gray-200">
                        <td className="px-4 py-3">{st.displayName || st.type}</td>
                        <td className="px-4 py-3">{st.count}</td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            min="1"
                            step="0.01"
                            value={caps[st.type] ?? ''}
                            onChange={(e) => setCaps((prev) => ({ ...prev, [st.type]: e.target.value }))}
                            className="w-40 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium text-gray-800">
            Cancel
          </button>
          <button disabled={saving || loading} onClick={submit} className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg font-medium">
            {saving ? 'Submitting…' : mode === 'edit' ? 'Save Caps' : 'Submit & Approve'}
          </button>
        </div>
      </div>
    </div>
  )
}
