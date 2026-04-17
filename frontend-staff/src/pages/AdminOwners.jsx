import { useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../useAuth'
import Modal from '../components/Modal'
import PaginationControls from '../components/PaginationControls'

function OwnerCard({ owner, expanded, onToggle, theatersCount }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-semibold text-slate-900">{owner.name || owner.email}</div>
          <div className="text-sm text-slate-500">{owner.email || '—'}</div>
        </div>
        <div className="text-sm text-slate-500">{theatersCount} theaters</div>
      </div>
      <div className="mt-3">
        <button type="button" onClick={onToggle} className="text-sm text-blue-600">{expanded ? 'Hide theaters' : 'Show theaters'}</button>
      </div>
    </div>
  )
}

export default function AdminOwners() {
  const { auth } = useAuth()
  const [halls, setHalls] = useState([])
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)
  const [expandedOwnerId, setExpandedOwnerId] = useState(null)
  const [expandedTheaterId, setExpandedTheaterId] = useState(null)
  const [selectedHallId, setSelectedHallId] = useState(null)
  const [hallDetails, setHallDetails] = useState(null)

  useEffect(() => {
    if (!auth?.token) return
    let alive = true
    setLoading(true)
    setErr('')
    api('/admin/halls', { token: auth.token })
      .then((d) => {
        if (!alive) return
        setHalls(d.halls || [])
      })
      .catch((e) => setErr(e.message))
      .finally(() => { if (alive) setLoading(false) })

    return () => { alive = false }
  }, [auth?.token])

  const owners = useMemo(() => {
    const m = new Map()
    for (const h of halls || []) {
      const t = h.Theater
      const owner = t?.owner || null
      if (!owner || !owner.id) continue
      if (!m.has(owner.id)) m.set(owner.id, { owner, theaters: new Map() })
      const ownerEntry = m.get(owner.id)
      if (!ownerEntry.theaters.has(t.id)) ownerEntry.theaters.set(t.id, { theater: t, halls: [] })
      ownerEntry.theaters.get(t.id).halls.push(h)
    }
    return Array.from(m.values()).map((v) => ({ owner: v.owner, theaters: Array.from(v.theaters.values()) }))
  }, [halls])

  async function openHallDetails(hallId) {
    if (!auth?.token) return
    setSelectedHallId(hallId)
    setHallDetails(null)
    setErr('')
    try {
      // Try pending details first (admin pending view), fallback to caps/details
      const d = await api(`/admin/halls/pending/${hallId}`, { token: auth.token }).catch(() => null)
      if (d) {
        setHallDetails(d)
        return
      }
      const caps = await api(`/admin/halls/${hallId}/caps`, { token: auth.token }).catch(() => null)
      if (caps) {
        setHallDetails(caps)
        return
      }
      setErr('Unable to load hall details')
    } catch (e) {
      setErr(e.message)
    }
  }

  return (
    <div>
      <h2 className="text-4xl font-bold text-black mb-6">Multiplex Owners</h2>

      {err ? <div className="text-red-400 bg-red-900/20 p-4 rounded-lg border border-red-900 mb-6">{err}</div> : null}

      {loading ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">Loading…</div>
      ) : owners.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">No owners found.</div>
      ) : (
        <div className="grid gap-4">
          {owners.map(({ owner, theaters }) => (
            <div key={owner.id}>
              <OwnerCard
                owner={owner}
                theatersCount={theaters.length}
                expanded={expandedOwnerId === owner.id}
                onToggle={() => setExpandedOwnerId(expandedOwnerId === owner.id ? null : owner.id)}
              />

              {expandedOwnerId === owner.id ? (
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {theaters.map(({ theater, halls: thHalls }) => (
                    <div key={theater.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold">{theater.name}</div>
                          <div className="text-sm text-slate-500">{theater.city} • {theater.address}</div>
                        </div>
                        <div className="text-sm text-slate-500">{thHalls.length} halls</div>
                      </div>
                      <div className="mt-2">
                        <button type="button" onClick={() => setExpandedTheaterId(expandedTheaterId === theater.id ? null : theater.id)} className="text-sm text-blue-600">{expandedTheaterId === theater.id ? 'Hide halls' : 'Show halls'}</button>
                      </div>

                      {expandedTheaterId === theater.id ? (
                        <div className="mt-3 grid gap-2">
                          {thHalls.map((hh) => (
                            <div key={hh.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3">
                              <div>
                                <div className="font-medium">{hh.name}</div>
                                <div className="text-sm text-slate-500">Screen type: {hh.screenType || '—'}</div>
                              </div>
                              <div className="flex items-center gap-2">
                                <button type="button" onClick={() => openHallDetails(hh.id)} className="rounded-lg bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100">View details</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}

      <Modal
        open={Boolean(selectedHallId)}
        title={hallDetails?.hallName || 'Hall details'}
        onClose={() => { setSelectedHallId(null); setHallDetails(null); }}
        footer={
          <button type="button" onClick={() => { setSelectedHallId(null); setHallDetails(null); }} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white">Close</button>
        }
      >
        {hallDetails ? (
          <div className="space-y-3">
            <div className="text-sm text-slate-600">Screen type: {hallDetails.screenType || hallDetails.screenType || '—'}</div>
            <div className="text-sm text-slate-600">Total seats: {hallDetails.totalSeats ?? '—'}</div>
            <div className="text-sm text-slate-600">Theater: {hallDetails.theaterName || hallDetails.theater?.theaterName || '—'}</div>
            <div>
              <div className="text-sm font-medium">Seat types</div>
              <ul className="mt-2 space-y-2 text-sm text-slate-600">
                {(hallDetails.seatTypes || []).map((st) => (
                  <li key={st.type || st.seatTypeCode} className="flex items-center justify-between">
                    <div>{st.displayName || st.type || st.seatTypeName}</div>
                    <div className="text-slate-500">Count: {st.count ?? '—'} {st.price ? `• Price: ${st.price}` : ''}</div>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="text-sm font-medium">Seat layout</div>
              <pre className="mt-2 max-h-64 overflow-auto rounded-md bg-slate-50 p-3 text-xs">{JSON.stringify(hallDetails.seatLayout || hallDetails.seatLayout || {}, null, 2)}</pre>
            </div>
          </div>
        ) : (
          <div className="text-sm text-slate-500">Loading details…</div>
        )}
      </Modal>
    </div>
  )
}
