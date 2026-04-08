import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../AuthContext'
import SeatCapModal from '../components/SeatCapModal'

export default function AdminApprovals() {
  const { auth } = useAuth()
  const [data, setData] = useState(null)
  const [err, setErr] = useState('')
  const [capModalHallId, setCapModalHallId] = useState(null)
  const [activeTab, setActiveTab] = useState('halls')

  async function load() {
    if (!auth?.token) return
    const d = await api('/admin/approvals/pending', { token: auth.token })
    setData(d)
  }

  useEffect(() => {
    if (!auth?.token) return
    load().catch((e) => setErr(e.message))
  }, [auth?.token])

  async function actHall(hallId, approve) {
    await api('/admin/approvals/hall', { method: 'POST', token: auth.token, body: { hallId, approve } })
    await load()
  }

  async function actShow(showId, approve) {
    await api('/admin/approvals/show', { method: 'POST', token: auth.token, body: { showId, approve } })
    await load()
  }

  return (
    <div>
      <h2 className="text-4xl font-bold text-white mb-8">Approvals</h2>
      {err ? <div className="text-red-400 bg-red-900/20 p-4 rounded-lg border border-red-900 mb-6">{err}</div> : null}
      {!data ? (
        <div className="text-gray-300 text-lg">Loading…</div>
      ) : (
        <div className="space-y-8">
          <div className="bg-white rounded-xl shadow-lg p-2 inline-flex gap-2">
            <button
              onClick={() => setActiveTab('halls')}
              className={`px-5 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'halls' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Halls ({data.halls.length})
            </button>
            <button
              onClick={() => setActiveTab('shows')}
              className={`px-5 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'shows' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Shows ({data.shows.length})
            </button>
          </div>

          {activeTab === 'halls' ? (
            <div>
              <h3 className="text-2xl font-bold text-white mb-6">Pending halls</h3>
              <div className="space-y-4">
                {data.halls.map((h) => (
                  <div key={h.id} className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6">
                    <div className="font-bold text-lg text-gray-900 mb-3">
                      #{h.id} {h.Theater?.name} — {h.name}
                    </div>
                    <div className="text-sm text-gray-600 mb-3">
                      Screen type: {h.screenType || 'Not specified'}
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <Link
                        to={`/admin/approvals/${h.id}`}
                        className="px-6 py-2 bg-slate-700 hover:bg-slate-800 text-white font-medium rounded-lg transition-colors"
                      >
                        View details
                      </Link>
                      <button onClick={() => setCapModalHallId(h.id)} className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors">
                        Approve
                      </button>
                      <button onClick={() => actHall(h.id, false)} className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors">
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
                {data.halls.length === 0 ? <div className="text-gray-300 bg-white/10 p-6 rounded-lg text-center">No pending halls.</div> : null}
              </div>
            </div>
          ) : null}

          {activeTab === 'shows' ? (
            <div>
              <h3 className="text-2xl font-bold text-white mb-6">Pending shows</h3>
              <div className="space-y-4">
                {data.shows.map((s) => (
                  <div key={s.id} className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6">
                    <div className="font-bold text-lg text-gray-900 mb-2">
                      #{s.id} {s.Hall?.Theater?.name} — {s.Hall?.name} — {s.Movie?.title}
                    </div>
                    <div className="text-gray-600 text-sm mb-4">
                      {new Date(s.startsAt).toLocaleString()} ({s.language})
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <Link
                        to={`/admin/shows/${s.id}`}
                        className="px-6 py-2 bg-slate-700 hover:bg-slate-800 text-white font-medium rounded-lg transition-colors"
                      >
                        View details
                      </Link>
                      <button onClick={() => actShow(s.id, true)} className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors">
                        Approve
                      </button>
                      <button onClick={() => actShow(s.id, false)} className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors">
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
                {data.shows.length === 0 ? <div className="text-gray-300 bg-white/10 p-6 rounded-lg text-center">No pending shows.</div> : null}
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
    </div>
  )
}
