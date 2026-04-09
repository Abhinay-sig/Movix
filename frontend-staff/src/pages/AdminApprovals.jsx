import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../useAuth'

export default function AdminApprovals() {
  const { auth } = useAuth()
  const [data, setData] = useState(null)
  const [err, setErr] = useState('')

  async function load() {
    const response = await api('/admin/approvals/pending', { token: auth.token })
    setData(response)
  }

  useEffect(() => {
    load().catch((e) => setErr(e.message))
  }, [auth.token])

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

  const primaryBtn =
    'inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-medium transition-all duration-200 active:scale-[0.98]'
  const approveBtn =
    `${primaryBtn} bg-emerald-600 text-white shadow-sm hover:bg-emerald-500 hover:shadow-md`
  const rejectBtn =
    `${primaryBtn} bg-rose-600 text-white shadow-sm hover:bg-rose-500 hover:shadow-md`

  const theaters = data?.theaters || []
  const halls = data?.halls || []
  const shows = data?.shows || []

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
              <h3 className="text-lg font-semibold text-slate-900">
                Theater submissions
              </h3>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-500 ring-1 ring-slate-200">
                {theaters.length} items
              </span>
            </div>

            <div className="space-y-4">
              {theaters.map((theater) => (
                <div
                  key={theater.id}
                  className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="mb-4 space-y-1">
                    <div className="text-sm font-medium text-slate-400">
                      Theater submission
                    </div>
                    <div className="text-base font-semibold text-slate-900">
                      {theater.name}
                    </div>
                    <div className="text-sm text-slate-500">
                      {theater.address}, {theater.city}
                    </div>
                    <div className="text-sm text-slate-500">
                      Owner: {theater.owner?.name || 'Unknown'}{theater.owner?.email ? ` • ${theater.owner.email}` : ''}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => actTheater(theater.id, true)}
                      className={approveBtn}
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => actTheater(theater.id, false)}
                      className={rejectBtn}
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}

              {theaters.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-10 text-center text-sm text-slate-500">
                  All theater submissions are up to date.
                </div>
              ) : null}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-slate-50/70 p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-slate-900">
                Auditorium submissions
              </h3>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-500 ring-1 ring-slate-200">
                {halls.length} items
              </span>
            </div>

            <div className="space-y-4">
              {halls.map((hall) => (
                <div
                  key={hall.id}
                  className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="mb-4 space-y-1">
                    <div className="text-sm font-medium text-slate-400">
                      Auditorium submission
                    </div>
                    <div className="text-base font-semibold text-slate-900">
                      {hall.Theater?.name} <span className="text-slate-400">•</span> {hall.name}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => actHall(hall.id, true)}
                      className={approveBtn}
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => actHall(hall.id, false)}
                      className={rejectBtn}
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}

              {halls.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-10 text-center text-sm text-slate-500">
                  All auditorium submissions are up to date.
                </div>
              ) : null}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-slate-50/70 p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-slate-900">
                Showtime submissions
              </h3>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-500 ring-1 ring-slate-200">
                {shows.length} items
              </span>
            </div>

            <div className="space-y-4">
              {shows.map((show) => (
                <div
                  key={show.id}
                  className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="mb-4 space-y-1">
                    <div className="text-sm font-medium text-slate-400">
                      Showtime submission
                    </div>
                    <div className="text-base font-semibold text-slate-900">
                      {show.Hall?.Theater?.name} <span className="text-slate-400">•</span> {show.Hall?.name} <span className="text-slate-400">•</span> {show.Movie?.title}
                    </div>
                    <div className="text-sm text-slate-500">
                      {new Date(show.startsAt).toLocaleString()} • {show.language}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => actShow(show.id, true)}
                      className={approveBtn}
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => actShow(show.id, false)}
                      className={rejectBtn}
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}

              {shows.length === 0 ? (
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
