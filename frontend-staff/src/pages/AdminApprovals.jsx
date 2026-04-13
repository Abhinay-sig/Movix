import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../useAuth'
import SeatCapModal from '../components/SeatCapModal'
import RejectModal from '../components/RejectModal'

function timeAgo(value) {
  if (!value) return 'just now'
  const dt = new Date(value)
  const diffMs = Date.now() - dt.getTime()
  if (!Number.isFinite(diffMs)) return 'just now'
  const mins = Math.max(0, Math.floor(diffMs / 60000))
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
  const days = Math.floor(hours / 24)
  return `${days} day${days === 1 ? '' : 's'} ago`
}

function startsInText(startsAt) {
  const dt = new Date(startsAt)
  const diffMs = dt.getTime() - Date.now()
  if (!Number.isFinite(diffMs)) return 'Starts soon'
  if (diffMs <= 0) {
    const minsPast = Math.floor(Math.abs(diffMs) / 60000)
    if (minsPast < 60) return `Started ${minsPast} minute${minsPast === 1 ? '' : 's'} ago`
    const hrsPast = Math.floor(minsPast / 60)
    return `Started ${hrsPast} hour${hrsPast === 1 ? '' : 's'} ago`
  }
  const mins = Math.floor(diffMs / 60000)
  if (mins < 60) return `Starts in ${mins} minute${mins === 1 ? '' : 's'}`
  const hours = Math.floor(mins / 60)
  return `Starts in ${hours} hour${hours === 1 ? '' : 's'}`
}

function submittedAgeMs(value) {
  if (!value) return 0
  const dt = new Date(value)
  const diff = Date.now() - dt.getTime()
  return Number.isFinite(diff) ? Math.max(0, diff) : 0
}

function priorityForHall(hall) {
  const ageMs = submittedAgeMs(hall?.createdAt)
  if (ageMs < 6 * 60 * 60 * 1000) return { label: 'New', className: 'bg-emerald-100 text-emerald-800 border-emerald-200' }
  if (ageMs > 24 * 60 * 60 * 1000) return { label: 'Old', className: 'bg-amber-100 text-amber-800 border-amber-200' }
  return null
}

function priorityForShow(show) {
  const now = Date.now()
  const startMs = new Date(show?.startsAt).getTime()
  if (Number.isFinite(startMs)) {
    const until = startMs - now
    if (until > 0 && until <= 6 * 60 * 60 * 1000) {
      return { label: 'Urgent', className: 'bg-rose-100 text-rose-800 border-rose-200' }
    }
  }
  const ageMs = submittedAgeMs(show?.createdAt)
  if (ageMs < 6 * 60 * 60 * 1000) return { label: 'New', className: 'bg-emerald-100 text-emerald-800 border-emerald-200' }
  if (ageMs > 24 * 60 * 60 * 1000) return { label: 'Old', className: 'bg-amber-100 text-amber-800 border-amber-200' }
  return null
}

export default function AdminApprovals() {
  const { auth } = useAuth()
  const [data, setData] = useState(null)
  const [err, setErr] = useState('')
  const [capModalHallId, setCapModalHallId] = useState(null)
  const [activeTab, setActiveTab] = useState('halls')
  const [sortOrder, setSortOrder] = useState('newest')
  const [rejectModalOpen, setRejectModalOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)
  const [entityType, setEntityType] = useState(null)
  const [rejectSubmitting, setRejectSubmitting] = useState(false)
  const [rejectError, setRejectError] = useState('')
  const [toast, setToast] = useState('')

  async function load() {
    if (!auth?.token) return
    const d = await api('/admin/approvals/pending', { token: auth.token })
    setData(d)
  }

  useEffect(() => {
    if (!auth?.token) return
    load().catch((e) => setErr(e.message))
  }, [auth?.token])

  async function actTheater(theaterId, approve) {
    await api('/admin/approvals/theater', {
      method: 'POST',
      token: auth.token,
      body: { theaterId, approve },
    })
    await load()
  }

  async function actHall(hallId, approve) {
    await api('/admin/approvals/hall', {
      method: 'POST',
      token: auth.token,
      body: { hallId, approve },
    })
    await load()
  }

  async function actShow(showId, approve) {
    await api('/admin/approvals/show', {
      method: 'POST',
      token: auth.token,
      body: { showId, approve },
    })
    await load()
  }

  function openRejectModal(e, entity, item) {
    e.preventDefault()
    e.stopPropagation()
    setSelectedItem(item)
    setEntityType(entity)
    setRejectError('')
    setRejectModalOpen(true)
  }

  async function handleRejectSubmit(reason) {
    if (!selectedItem?.id || !entityType) return
    setRejectSubmitting(true)
    setRejectError('')
    try {
      if (entityType === 'show') {
        await api(`/admin/shows/${selectedItem.id}/reject`, {
          method: 'POST',
          token: auth.token,
          body: { reason },
        })
      }
      if (entityType === 'hall') {
        await api(`/admin/halls/${selectedItem.id}/reject`, {
          method: 'POST',
          token: auth.token,
          body: { reason },
        })
      }
      setRejectModalOpen(false)
      setSelectedItem(null)
      setEntityType(null)
      setToast(`${entityType === 'hall' ? 'Hall' : 'Show'} rejected successfully`)
      await load()
    } catch (e) {
      setRejectError(e.message || 'Failed to reject')
    } finally {
      setRejectSubmitting(false)
    }
  }

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(''), 2500)
    return () => clearTimeout(timer)
  }, [toast])

  const sortedHalls = useMemo(() => {
    const halls = [...(data?.halls || [])]
    halls.sort((a, b) => {
      const ta = new Date(a.createdAt || 0).getTime()
      const tb = new Date(b.createdAt || 0).getTime()
      return sortOrder === 'newest' ? tb - ta : ta - tb
    })
    return halls
  }, [data?.halls, sortOrder])

  const sortedShows = useMemo(() => {
    const shows = [...(data?.shows || [])]
    shows.sort((a, b) => {
      const ta = new Date(a.createdAt || 0).getTime()
      const tb = new Date(b.createdAt || 0).getTime()
      return sortOrder === 'newest' ? tb - ta : ta - tb
    })
    return shows
  }, [data?.shows, sortOrder])

  return (
    <div>
      <h2 className="text-4xl font-bold text-black">Approvals</h2>
      {err ? <div className="text-red-400 bg-red-900/20 p-4 rounded-lg border border-red-900 mb-6">{err}</div> : null}
      {toast ? (
        <div className="fixed top-4 right-4 z-50 bg-emerald-600 text-white px-4 py-2 rounded-lg shadow-lg">{toast}</div>
      ) : null}

      {!data ? (
        <div className="text-gray-300 text-lg">Loading…</div>
      ) : (
        <div className="space-y-8">
          {(data.theaters || []).length ? (
            <div className="bg-white rounded-xl p-4 shadow-md">
              <h3 className="text-lg font-bold text-black mb-3">Pending theaters</h3>
              <div className="space-y-3">
                {data.theaters.map((t) => (
                  <div key={t.id} className="rounded-lg border border-slate-200 p-3 flex items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold text-slate-900">{t.name}</div>
                      <div className="text-sm text-slate-500">{t.address}, {t.city}</div>
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => actTheater(t.id, true)} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg">Approve</button>
                      <button type="button" onClick={() => actTheater(t.id, false)} className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg">Reject</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="mt-4 flex items-center justify-between gap-3">
            <div className="bg-white rounded-xl p-2 flex gap-2">
              <button onClick={() => setActiveTab('halls')} className={`px-7 py-3 rounded-xl font-semibold transition-all ${activeTab === 'halls' ? 'bg-blue-700 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                Halls ({data.halls.length})
              </button>
              <button onClick={() => setActiveTab('shows')} className={`px-7 py-3 rounded-xl font-semibold transition-all ${activeTab === 'shows' ? 'bg-blue-700 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                Shows ({data.shows.length})
              </button>
            </div>
            <div className="flex items-center gap-2 text-white">
              <label className="text-sm font-medium whitespace-nowrap">Sort:</label>
              <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="h-[52px] px-4 border border-gray-300 rounded-xl bg-white text-gray-700 min-w-[180px]">
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
              </select>
            </div>
          </div>

          {activeTab === 'halls' ? (
            <div>
              <h3 className="text-2xl font-bold text-black mb-6">Pending halls</h3>
              <div className="space-y-4">
                {sortedHalls.map((h) => (
                  <div key={h.id} className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6">
                    {priorityForHall(h) ? <div className="mb-2"><span className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full border ${priorityForHall(h).className}`}>{priorityForHall(h).label}</span></div> : null}
                    <div className="font-extrabold text-xl text-gray-900 mb-2">#{h.id} {h.Theater?.name} — {h.name}</div>
                    <div className="text-sm text-gray-400 mb-2">Submitted {timeAgo(h.createdAt)}</div>
                    <div className="mb-4"><span className="inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full border border-indigo-200 bg-indigo-50 text-indigo-700">{h.screenType || 'Not specified'}</span></div>
                    <div className="flex flex-wrap gap-3">
                      <button type="button" onClick={() => setCapModalHallId(h.id)} className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors">Approve</button>
                      <Link to={`/admin/approvals/${h.id}`} className="px-6 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium rounded-lg transition-colors border border-slate-300">View details</Link>
                      <button type="button" onPointerDown={(e) => { e.preventDefault(); e.stopPropagation() }} onClick={(e) => openRejectModal(e, 'hall', h)} className="px-6 py-2 bg-red-50 hover:bg-red-100 text-red-700 font-medium rounded-lg transition-colors border border-red-200">Reject</button>
                    </div>
                  </div>
                ))}
                {sortedHalls.length === 0 ? <div className="text-gray-300 bg-white/10 p-6 rounded-lg text-center">No pending halls.</div> : null}
              </div>
            </div>
          ) : null}

          {activeTab === 'shows' ? (
            <div>
              <h3 className="text-2xl font-bold text-black mb-6">Pending shows</h3>
              <div className="space-y-4">
                {sortedShows.map((s) => (
                  <div key={s.id} className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6">
                    {priorityForShow(s) ? <div className="mb-2"><span className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full border ${priorityForShow(s).className}`}>{priorityForShow(s).label}</span></div> : null}
                    <div className="font-extrabold text-xl text-gray-900 mb-2">#{s.id} {s.Hall?.Theater?.name} — {s.Hall?.name} — {s.Movie?.title}</div>
                    <div className="text-sm text-gray-400 mb-2">Submitted {timeAgo(s.createdAt)}</div>
                    <div className="text-gray-500 text-sm mb-4">{new Date(s.startsAt).toLocaleString()} ({s.language}) • {startsInText(s.startsAt)}</div>
                    <div className="flex flex-wrap gap-3">
                      <button type="button" onClick={() => actShow(s.id, true)} className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors">Approve</button>
                      <Link to={`/admin/shows/${s.id}`} className="px-6 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium rounded-lg transition-colors border border-slate-300">View details</Link>
                      <button type="button" onPointerDown={(e) => { e.preventDefault(); e.stopPropagation() }} onClick={(e) => openRejectModal(e, 'show', s)} className="px-6 py-2 bg-red-50 hover:bg-red-100 text-red-700 font-medium rounded-lg transition-colors border border-red-200">Reject</button>
                    </div>
                  </div>
                ))}
                {sortedShows.length === 0 ? <div className="text-gray-300 bg-white/10 p-6 rounded-lg text-center">No pending shows.</div> : null}
              </div>
            </div>
          ) : null}
        </div>
      )}

      <SeatCapModal
        open={Boolean(capModalHallId)}
        hallId={capModalHallId}
        token={auth?.token}
        onClose={() => setCapModalHallId(null)}
        onApproved={() => load().catch(() => {})}
      />

      <RejectModal
        open={rejectModalOpen}
        entityType={entityType}
        submitting={rejectSubmitting}
        error={rejectError}
        onClose={() => {
          if (rejectSubmitting) return
          setRejectModalOpen(false)
          setSelectedItem(null)
          setEntityType(null)
          setRejectError('')
        }}
        onSubmit={handleRejectSubmit}
      />
    </div>
  )
}
