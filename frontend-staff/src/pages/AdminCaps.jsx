import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../useAuth'
import SeatCapModal from '../components/SeatCapModal'
import SeatCapHistoryModal from '../components/SeatCapHistoryModal'

export default function AdminCaps() {
  const { auth } = useAuth()
  const [halls, setHalls] = useState([])
  const [theaters, setTheaters] = useState([])
  const [theaterId, setTheaterId] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [editHallId, setEditHallId] = useState(null)
  const [historyHallId, setHistoryHallId] = useState(null)

  function uniqueTheatersFromHalls(rows) {
    const m = new Map()
    for (const h of rows || []) {
      const t = h.Theater
      if (!t?.id) continue
      if (!m.has(t.id)) m.set(t.id, { id: t.id, name: t.name })
    }
    return Array.from(m.values()).sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')))
  }

  async function load(selectedTheaterId = theaterId) {
    if (!auth?.token) return
    setLoading(true)
    setErr('')
    try {
      const query = selectedTheaterId ? `?theaterId=${encodeURIComponent(selectedTheaterId)}` : ''
      const d = await api(`/admin/halls${query}`, { token: auth.token })
      setHalls(d.halls || [])

      if (!theaters.length) {
        const all = await api('/admin/halls', { token: auth.token })
        setTheaters(uniqueTheatersFromHalls(all.halls || []))
      }
    } catch (e) {
      setErr(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load().catch(() => {})
  }, [auth?.token])

  async function onTheaterChange(nextId) {
    setTheaterId(nextId)
    await load(nextId)
  }

  return (
    <div>
      <h2 className="text-4xl font-bold text-black mb-8">Seat Caps</h2>
      {err ? <div className="text-red-400 bg-red-900/20 p-4 rounded-lg border border-red-900 mb-6">{err}</div> : null}

      <div className="bg-white rounded-xl shadow-lg p-6 mb-6 max-w-md">
        <label className="block text-gray-700 font-medium mb-2">Filter by theater</label>
        <select
          value={theaterId}
          onChange={(e) => onTheaterChange(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Theaters</option>
          {theaters.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name || `Theater #${t.id}`}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-gray-300 text-lg">Loading halls…</div>
      ) : (
        <div className="space-y-4">
          {halls.map((h) => (
            <div key={h.id} className="bg-white rounded-lg shadow-md p-6">
              <div className="text-lg font-bold text-gray-900">
                #{h.id} {h.Theater?.name} — {h.name}
              </div>
              <div className="text-sm text-gray-600 mt-1">
                {h.Theater?.city}, {h.Theater?.address}
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <button type="button" onClick={() => setEditHallId(h.id)} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium">
                  Edit Caps
                </button>
                <button type="button" onClick={() => setHistoryHallId(h.id)} className="px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-lg font-medium">
                  View History
                </button>
              </div>
            </div>
          ))}
          {halls.length === 0 ? <div className="text-gray-300 bg-white/10 p-6 rounded-lg text-center">No halls found for selected theater.</div> : null}
        </div>
      )}

      <SeatCapModal
        open={Boolean(editHallId)}
        hallId={editHallId}
        token={auth?.token}
        mode="edit"
        onClose={() => setEditHallId(null)}
        onApproved={() => load().catch(() => {})}
      />

      <SeatCapHistoryModal
        open={Boolean(historyHallId)}
        hallId={historyHallId}
        token={auth?.token}
        onClose={() => setHistoryHallId(null)}
      />
    </div>
  )
}
