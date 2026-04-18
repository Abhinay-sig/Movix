import { useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../useAuth'
import Modal from '../components/Modal'

function OwnerCard({ owner, theatersCount, onOpen }) {
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
        <button type="button" onClick={onOpen} className="text-sm text-blue-600">Show theaters</button>
      </div>
    </div>
  )
}

function hasSeat(segmentsByRow, r, c) {
  const row = Array.isArray(segmentsByRow?.[r]) ? segmentsByRow[r] : []
  for (let i = 0; i < row.length; i += 2) {
    const start = Number(row[i])
    const end = Number(row[i + 1])
    if (Number.isFinite(start) && Number.isFinite(end) && c >= start && c <= end) return true
  }
  return false
}

export default function AdminOwners() {
  const { auth } = useAuth()
  const [halls, setHalls] = useState([])
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  const [modalOwner, setModalOwner] = useState(null)
  const [modalTheater, setModalTheater] = useState(null)
  const [modalLevel, setModalLevel] = useState(null) // 'owner' | 'theater' | 'hall'

  const [selectedHallId, setSelectedHallId] = useState(null)
  const [hallDetails, setHallDetails] = useState(null)

  useEffect(() => {
    if (!auth?.token) return
    let alive = true
    setLoading(true)
    setErr('')
    api('/admin/halls', { token: auth.token })
      .then((d) => { if (!alive) return; setHalls(d.halls || []) })
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
      const entry = m.get(owner.id)
      if (!entry.theaters.has(t.id)) entry.theaters.set(t.id, { theater: t, halls: [] })
      entry.theaters.get(t.id).halls.push(h)
    }
    return Array.from(m.values()).map((v) => ({ owner: v.owner, theaters: Array.from(v.theaters.values()) }))
  }, [halls])

  function openOwnerModal(owner) {
    setModalOwner(owner)
    setModalTheater(null)
    setModalLevel('owner')
    setSelectedHallId(null)
    setHallDetails(null)
  }

  function openTheaterModal(theater) {
    setModalTheater(theater)
    setModalLevel('theater')
    setSelectedHallId(null)
    setHallDetails(null)
  }

  async function openHallDetails(hallId) {
    if (!auth?.token) return
    setSelectedHallId(hallId)
    setHallDetails(null)
    setErr('')
    try {
      // pending (unapproved) hall details include seatLayout
      const pending = await api(`/admin/halls/pending/${hallId}`, { token: auth.token }).catch(() => null)
      if (pending) {
        setHallDetails(pending)
        setModalLevel('hall')
        return
      }

      // approved halls: get caps/details then try to extract HallLayout from /admin/halls list
      const caps = await api(`/admin/halls/${hallId}/caps`, { token: auth.token }).catch(() => null)
      let layout = null
      const all = await api('/admin/halls', { token: auth.token }).catch(() => null)
      if (all && Array.isArray(all.halls)) {
        const found = all.halls.find((hh) => Number(hh.id) === Number(hallId))
        if (found) layout = found.HallLayout || found.hallLayout || null
      }

      if (caps) {
        const merged = { ...caps }
        if (layout) merged.seatLayout = layout
        setHallDetails(merged)
        setModalLevel('hall')
        return
      }

      setErr('Unable to load hall details')
    } catch (e) {
      setErr(e.message)
    }
  }

  // helper to get theaters/halls for current modalOwner
  const currentOwnerEntry = modalOwner ? owners.find((o) => Number(o.owner.id) === Number(modalOwner.id)) : null

  // layout preview calculations
  const layoutRows = hallDetails?.seatLayout?.rows ?? 0
  const layoutCols = hallDetails?.seatLayout?.cols ?? 0
  const segmentsByRow = hallDetails?.seatLayout?.segmentsByRow ?? []
  const layoutPreview = useMemo(() => {
    if (!layoutRows || !layoutCols) return []
    const arr = []
    for (let r = 0; r < layoutRows; r++) {
      for (let c = 0; c < layoutCols; c++) {
        arr.push(hasSeat(segmentsByRow, r, c))
      }
    }
    return arr
  }, [layoutRows, layoutCols, segmentsByRow])

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
              <OwnerCard owner={owner} theatersCount={theaters.length} onOpen={() => openOwnerModal(owner)} />
            </div>
          ))}
        </div>
      )}

      <Modal
        open={Boolean(modalLevel)}
        title={
          modalLevel === 'owner' ? modalOwner?.name || 'Owner' : modalLevel === 'theater' ? modalTheater?.name || 'Theater' : hallDetails?.hallName || 'Hall details'
        }
        onClose={() => { setModalLevel(null); setModalOwner(null); setModalTheater(null); setSelectedHallId(null); setHallDetails(null) }}
        footer={
          <div className="flex items-center gap-2">
            {modalLevel === 'theater' ? (
              <button onClick={() => setModalLevel('owner')} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700">Back</button>
            ) : modalLevel === 'hall' ? (
              <button onClick={() => setModalLevel('theater')} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700">Back</button>
            ) : null}
            <button onClick={() => { setModalLevel(null); setModalOwner(null); setModalTheater(null); setSelectedHallId(null); setHallDetails(null) }} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white">Close</button>
          </div>
        }
      >
        {modalLevel === 'owner' ? (
          <div className="space-y-3">
            {currentOwnerEntry && currentOwnerEntry.theaters.length ? (
              <div className="grid gap-3 grid-cols-1">
                {currentOwnerEntry.theaters.map(({ theater, halls: thHalls }) => (
                  <div key={theater.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold">{theater.name}</div>
                        <div className="text-sm text-slate-500">{theater.city} • {theater.address}</div>
                      </div>
                      <div className="text-sm text-slate-500">{thHalls.length} halls</div>
                    </div>
                    <div className="mt-3">
                      <button onClick={() => openTheaterModal(theater)} className="text-sm text-blue-600">Open theater</button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-slate-500">No theaters available.</div>
            )}
          </div>
        ) : modalLevel === 'theater' ? (
          <div className="space-y-3">
            {modalTheater ? (
              <div className="grid gap-2">
                {(currentOwnerEntry?.theaters.find((t) => Number(t.theater.id) === Number(modalTheater.id))?.halls || []).map((hh) => (
                  <div key={hh.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3">
                    <div>
                      <div className="font-medium">{hh.name}</div>
                      <div className="text-sm text-slate-500">Screen type: {hh.screenType || '—'}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => openHallDetails(hh.id)} className="rounded-lg bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100">View details</button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-slate-500">No halls available.</div>
            )}
          </div>
        ) : modalLevel === 'hall' ? (
          hallDetails ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium">Hall</div>
                  <div className="text-sm text-slate-700">{hallDetails.hallName || hallDetails.hallName}</div>
                </div>
                <div>
                  <div className="text-sm font-medium">Theater</div>
                  <div className="text-sm text-slate-700">{hallDetails.theaterName || hallDetails.theater?.theaterName}</div>
                </div>
              </div>

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
                <div className="text-sm font-medium mb-2">Layout Preview</div>
                {layoutPreview.length ? (
                  <div className="overflow-auto max-h-[300px] border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${layoutCols}, 8px)`, gap: 2, width: layoutCols * 10 }}>
                      {layoutPreview.map((seat, i) => (
                        <div key={i} style={{ width: 8, height: 8, borderRadius: 2, background: seat ? '#1f2937' : '#e5e7eb' }} />
                      ))}
                    </div>
                    <div className="text-xs text-gray-500 mt-3">Showing {layoutRows} rows × {layoutCols} columns.</div>
                  </div>
                ) : (
                  <div className="text-sm text-slate-500">No layout data available.</div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-sm text-slate-500">Loading details…</div>
          )
        ) : null}
      </Modal>
    </div>
  )
}
