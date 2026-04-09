import { useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../AuthContext'

const ALL_THEATERS = '__all_theaters__'
const ALL_HALLS = '__all_halls__'

export default function AdminBlocking() {
  const { auth } = useAuth()
  const [entity, setEntity] = useState('theater')
  const [visible, setVisible] = useState(true)
  const [reason, setReason] = useState('policy')
  const [customReason, setCustomReason] = useState('')
  const [theaterId, setTheaterId] = useState('')
  const [hallId, setHallId] = useState('')
  const [showId, setShowId] = useState('')
  const [halls, setHalls] = useState([])
  const [shows, setShows] = useState([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  const theaters = useMemo(() => {
    const map = new Map()
    for (const h of halls) {
      const t = h.Theater
      if (!t?.id) continue
      if (!map.has(t.id)) map.set(t.id, t)
    }
    return Array.from(map.values()).sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')))
  }, [halls])

  const hallsForTheater = useMemo(
    () => halls.filter((h) => theaterId && theaterId !== ALL_THEATERS && String(h.theaterId) === String(theaterId)),
    [halls, theaterId]
  )

  const showsForHall = useMemo(
    () => shows.filter((s) => !hallId || String(s.hallId) === String(hallId)),
    [shows, hallId]
  )

  const blockedTheaters = useMemo(() => theaters.filter((t) => t.isBlocked), [theaters])
  const blockedHalls = useMemo(() => halls.filter((h) => h.isBlocked), [halls])
  const blockedShows = useMemo(() => shows.filter((s) => s.isBlocked), [shows])
  const isAllTheaters = theaterId === ALL_THEATERS
  const isAllHalls = hallId === ALL_HALLS

  const impactText = useMemo(() => {
    if (isAllTheaters) return 'This action will affect all theaters.'
    const selectedTheater = theaters.find((t) => String(t.id) === String(theaterId))
    if (theaterId && isAllHalls) {
      return `This action will affect all halls in ${selectedTheater?.name || 'selected theater'}.`
    }
    if (theaterId && hallId && hallId !== ALL_HALLS) {
      const selectedHall = halls.find((h) => String(h.id) === String(hallId))
      if (entity === 'show' && showId) {
        return `This action will affect selected show in ${selectedHall?.name || 'selected hall'}.`
      }
      return `This action will affect ${selectedHall?.name || 'selected hall'}.`
    }
    return 'Select entities to apply visibility.'
  }, [isAllTheaters, isAllHalls, theaterId, theaters, hallId, halls, entity, showId])

  async function load() {
    if (!auth?.token) return
    setLoading(true)
    setErr('')
    try {
      const [h, p] = await Promise.all([
        api('/admin/halls', { token: auth.token }),
        api('/admin/approvals/pending', { token: auth.token }),
      ])
      setHalls(h.halls || [])
      setShows(p.shows || [])
    } catch (e) {
      setErr(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load().catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth?.token])

  useEffect(() => {
    if (theaterId === ALL_THEATERS) setHallId(ALL_HALLS)
    else setHallId('')
    setShowId('')
  }, [theaterId])

  useEffect(() => {
    setShowId('')
  }, [hallId])

  async function submit(e) {
    e.preventDefault()
    setErr('')

    try {
      let targetIds = []
      if (entity === 'theater') {
        targetIds = isAllTheaters ? theaters.map((t) => Number(t.id)) : [Number(theaterId)]
      } else if (entity === 'hall') {
        if (isAllTheaters) targetIds = halls.map((h) => Number(h.id))
        else if (isAllHalls) targetIds = hallsForTheater.map((h) => Number(h.id))
        else targetIds = [Number(hallId)]
      } else {
        if (isAllTheaters) targetIds = shows.map((s) => Number(s.id))
        else if (isAllHalls) {
          const theaterHallIds = new Set(hallsForTheater.map((h) => Number(h.id)))
          targetIds = shows.filter((s) => theaterHallIds.has(Number(s.hallId))).map((s) => Number(s.id))
        } else if (hallId && hallId !== ALL_HALLS && showId) {
          targetIds = [Number(showId)]
        }
      }

      targetIds = Array.from(new Set(targetIds.filter((id) => Number.isFinite(id) && id > 0)))
      if (targetIds.length === 0) {
        setErr('Please select a valid scope/entity.')
        return
      }

      await Promise.all(
        targetIds.map((id) =>
          api('/admin/block', {
            method: 'POST',
            token: auth.token,
            body: { entity, id, blocked: !visible },
          })
        )
      )
      const reasonText = reason === 'other' ? customReason.trim() : reason
      alert(`Visibility updated (${visible ? 'visible' : 'hidden'}) for ${targetIds.length} item(s).${reasonText ? ` Reason: ${reasonText}` : ''}`)
      await load()
    } catch (e2) {
      setErr(e2.message)
    }
  }

  return (
    <div>
      <h2 className="text-4xl font-bold text-white mb-8">Manage Visibility</h2>
      {err ? <div className="text-red-400 bg-red-900/20 p-4 rounded-lg border border-red-900 mb-6">{err}</div> : null}
      {loading ? <div className="text-gray-300 text-lg mb-6">Loading visibility data…</div> : null}

      <div className="bg-white rounded-xl shadow-lg p-8 max-w-3xl">
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-gray-700 font-medium mb-2">Entity type</label>
            <select value={entity} onChange={(e) => setEntity(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="theater">Theater</option>
              <option value="hall">Hall</option>
              <option value="show">Show</option>
            </select>
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-2">Theater</label>
            <select value={theaterId} onChange={(e) => setTheaterId(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Select theater</option>
              <option value={ALL_THEATERS}>All Theaters</option>
              {theaters.map((t) => (
                <option key={t.id} value={t.id}>
                  #{t.id} {t.name}
                </option>
              ))}
            </select>
          </div>

          {(entity === 'hall' || entity === 'show') && theaterId && !isAllTheaters ? (
            <div className="transition-all duration-200">
              <label className="block text-gray-700 font-medium mb-2">Hall</label>
              <select
                value={hallId}
                onChange={(e) => setHallId(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select hall</option>
                <option value={ALL_HALLS}>All Halls</option>
                {hallsForTheater.map((h) => (
                  <option key={h.id} value={h.id}>
                    #{h.id} {h.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {entity === 'show' && theaterId && !isAllTheaters && hallId && !isAllHalls ? (
            <div className="transition-all duration-200">
              <label className="block text-gray-700 font-medium mb-2">Show</label>
              <select
                value={showId}
                onChange={(e) => setShowId(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select show</option>
                {showsForHall.map((s) => (
                  <option key={s.id} value={s.id}>
                    #{s.id} {s.Movie?.title || 'Movie'} ({new Date(s.startsAt).toLocaleString()})
                  </option>
                ))}
              </select>
              <div className="text-xs text-gray-500 mt-1">Show options currently use pending shows list.</div>
            </div>
          ) : null}

          {isAllTheaters ? <div className="text-xs text-gray-500">Applies to all theaters</div> : null}
          {entity !== 'theater' && theaterId && !isAllTheaters && isAllHalls ? (
            <div className="text-xs text-gray-500">Applies to all halls in selected theater</div>
          ) : null}

          <div className="text-xs text-blue-700 bg-blue-50 border border-blue-200 p-3 rounded-lg">
            {impactText}
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-2">Visibility</label>
            <button
              type="button"
              onClick={() => setVisible((v) => !v)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border transition-colors ${
                visible
                  ? 'bg-green-50 border-green-300 text-green-700'
                  : 'bg-red-50 border-red-300 text-red-700'
              }`}
            >
              <span className="font-medium">{visible ? 'Visible (Shown to users)' : 'Hidden (Blocked from users)'}</span>
              <span className={`inline-block w-11 h-6 rounded-full relative ${visible ? 'bg-green-500' : 'bg-red-500'}`}>
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all ${visible ? 'left-5' : 'left-0.5'}`} />
              </span>
            </button>
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-2">Reason</label>
            <select value={reason} onChange={(e) => setReason(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="policy">Policy violation</option>
              <option value="maintenance">Maintenance issue</option>
              <option value="quality">Quality concerns</option>
              <option value="other">Other</option>
            </select>
          </div>

          {reason === 'other' ? (
            <input
              placeholder="Enter custom reason"
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          ) : null}

          <div className="text-sm text-amber-800 bg-amber-50 border border-amber-200 p-3 rounded-lg">
            Blocking will hide this from users.
          </div>

          <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-colors">
            Apply Visibility
          </button>
        </form>
      </div>

      <div className="mt-8 bg-white rounded-xl shadow-lg p-8">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Currently Blocked Entities</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h4 className="font-semibold text-gray-800 mb-2">Theaters</h4>
            <div className="space-y-2">
              {blockedTheaters.map((t) => (
                <div key={t.id} className="text-sm text-gray-700 bg-gray-50 p-2 rounded border border-gray-200">
                  #{t.id} {t.name}
                </div>
              ))}
              {blockedTheaters.length === 0 ? <div className="text-sm text-gray-500">None blocked</div> : null}
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-gray-800 mb-2">Halls</h4>
            <div className="space-y-2">
              {blockedHalls.map((h) => (
                <div key={h.id} className="text-sm text-gray-700 bg-gray-50 p-2 rounded border border-gray-200">
                  #{h.id} {h.name}
                </div>
              ))}
              {blockedHalls.length === 0 ? <div className="text-sm text-gray-500">None blocked</div> : null}
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-gray-800 mb-2">Shows</h4>
            <div className="space-y-2">
              {blockedShows.map((s) => (
                <div key={s.id} className="text-sm text-gray-700 bg-gray-50 p-2 rounded border border-gray-200">
                  #{s.id} {s.Movie?.title || 'Movie'}
                </div>
              ))}
              {blockedShows.length === 0 ? <div className="text-sm text-gray-500">None blocked</div> : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
