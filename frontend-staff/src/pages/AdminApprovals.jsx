// import { useEffect, useState } from 'react'
// import { api } from '../lib/api'
// import { useAuth } from '../AuthContext'

// export default function AdminApprovals() {
//   const { auth } = useAuth()
//   const [data, setData] = useState(null)
//   const [err, setErr] = useState('')

//   async function load() {
//     const d = await api('/admin/approvals/pending', { token: auth.token })
//     setData(d)
//   }

//   useEffect(() => {
//     load().catch((e) => setErr(e.message))
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [])

//   async function actHall(hallId, approve) {
//     await api('/admin/approvals/hall', { method: 'POST', token: auth.token, body: { hallId, approve } })
//     await load()
//   }

//   async function actShow(showId, approve) {
//     await api('/admin/approvals/show', { method: 'POST', token: auth.token, body: { showId, approve } })
//     await load()
//   }

//   return (
//     <div>
//       <h2 className="text-4xl font-bold text-white mb-8">Approvals</h2>
//       {err ? <div className="text-red-400 bg-red-900/20 p-4 rounded-lg border border-red-900 mb-6">{err}</div> : null}
//       {!data ? (
//         <div className="text-gray-300 text-lg">Loading…</div>
//       ) : (
//         <div className="space-y-8">
//           <div>
//             <h3 className="text-2xl font-bold text-white mb-6">Pending halls</h3>
//             <div className="space-y-4">
//               {data.halls.map((h) => (
//                 <div key={h.id} className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6">
//                   <div className="font-bold text-lg text-gray-900 mb-3">
//                     #{h.id} {h.Theater?.name} — {h.name}
//                   </div>
//                   <div className="flex gap-3">
//                     <button onClick={() => actHall(h.id, true)} className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors">
//                       Approve
//                     </button>
//                     <button onClick={() => actHall(h.id, false)} className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors">
//                       Reject
//                     </button>
//                   </div>
//                 </div>
//               ))}
//               {data.halls.length === 0 ? <div className="text-gray-300 bg-white/10 p-6 rounded-lg text-center">No pending halls.</div> : null}
//             </div>
//           </div>

//           <div>
//             <h3 className="text-2xl font-bold text-white mb-6">Pending shows</h3>
//             <div className="space-y-4">
//               {data.shows.map((s) => (
//                 <div key={s.id} className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6">
//                   <div className="font-bold text-lg text-gray-900 mb-2">
//                     #{s.id} {s.Hall?.Theater?.name} — {s.Hall?.name} — {s.Movie?.title}
//                   </div>
//                   <div className="text-gray-600 text-sm mb-4">
//                     {new Date(s.startsAt).toLocaleString()} ({s.language})
//                   </div>
//                   <div className="flex gap-3">
//                     <button onClick={() => actShow(s.id, true)} className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors">
//                       Approve
//                     </button>
//                     <button onClick={() => actShow(s.id, false)} className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors">
//                       Reject
//                     </button>
//                   </div>
//                 </div>
//               ))}
//               {data.shows.length === 0 ? <div className="text-gray-300 bg-white/10 p-6 rounded-lg text-center">No pending shows.</div> : null}
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   )
// }

import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../useAuth'

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

  const primaryBtn =
    'inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-medium transition-all duration-200 active:scale-[0.98]'
  const approveBtn =
    `${primaryBtn} bg-emerald-600 text-white shadow-sm hover:bg-emerald-500 hover:shadow-md`
  const rejectBtn =
    `${primaryBtn} bg-rose-600 text-white shadow-sm hover:bg-rose-500 hover:shadow-md`

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
          Review queue
        </h2>
        <p className="text-sm text-slate-500">
          Review venue and showtime submissions before they appear to guests.
        </p>
      </div>

      {err ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 shadow-sm">
          {err}
        </div>
      ) : null}

      {!data ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-8 text-sm text-slate-500 shadow-sm">
          Loading…
        </div>
      ) : (
        <div className="grid gap-8">
          <section className="rounded-3xl border border-slate-200 bg-slate-50/70 p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-slate-900">Auditorium submissions</h3>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-500 ring-1 ring-slate-200">
                {data.halls.length} items
              </span>
            </div>

            <div className="space-y-4">
              {data.halls.map((h) => (
                <div
                  key={h.id}
                  className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="mb-4 space-y-1">
                    <div className="text-sm font-medium text-slate-400">
                      Auditorium submission
                    </div>
                    <div className="text-base font-semibold text-slate-900">
                      {h.Theater?.name} <span className="text-slate-400">•</span> {h.name}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => actHall(h.id, true)}
                      className={approveBtn}
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => actHall(h.id, false)}
                      className={rejectBtn}
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}

              {data.halls.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-10 text-center text-sm text-slate-500">
                  All auditorium submissions are up to date.
                </div>
              ) : null}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-slate-50/70 p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-slate-900">Showtime submissions</h3>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-500 ring-1 ring-slate-200">
                {data.shows.length} items
              </span>
            </div>

            <div className="space-y-4">
              {data.shows.map((s) => (
                <div
                  key={s.id}
                  className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="mb-4 space-y-1">
                    <div className="text-sm font-medium text-slate-400">
                      Showtime submission
                    </div>
                    <div className="text-base font-semibold text-slate-900">
                      {s.Hall?.Theater?.name} <span className="text-slate-400">•</span>{' '}
                      {s.Hall?.name} <span className="text-slate-400">•</span>{' '}
                      {s.Movie?.title}
                    </div>
                    <div className="text-sm text-slate-500">
                      {new Date(s.startsAt).toLocaleString()} · {s.language}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => actShow(s.id, true)}
                      className={approveBtn}
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => actShow(s.id, false)}
                      className={rejectBtn}
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}

              {data.shows.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-10 text-center text-sm text-slate-500">
                  All showtime submissions are up to date.
                </div>
              ) : null}
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
