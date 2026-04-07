import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../AuthContext'

export default function AdminApprovals() {
  const { auth } = useAuth()
  const [data, setData] = useState(null)
  const [err, setErr] = useState('')

  async function load() {
    const d = await api('/admin/approvals/pending', { token: auth.token })
    setData(d)
  }

  useEffect(() => {
    load().catch((e) => setErr(e.message))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
          <div>
            <h3 className="text-2xl font-bold text-white mb-6">Pending halls</h3>
            <div className="space-y-4">
              {data.halls.map((h) => (
                <div key={h.id} className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6">
                  <div className="font-bold text-lg text-gray-900 mb-3">
                    #{h.id} {h.Theater?.name} — {h.name}
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => actHall(h.id, true)} className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors">
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
                  <div className="flex gap-3">
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
        </div>
      )}
    </div>
  )
}

