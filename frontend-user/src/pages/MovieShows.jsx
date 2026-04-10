import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../lib/api'

export default function MovieShows() {
  const { movieId } = useParams()
  const [shows, setShows] = useState([])
  const [movie, setMovie] = useState(null)
  const [err, setErr] = useState('')

  useEffect(() => {
    let alive = true
    api(`/public/movies/${movieId}/shows`)
      .then((d) => {
        if (!alive) return
        setShows(d.shows || [])
        setMovie(d.movie || null)
      })
      .catch((e) => alive && setErr(e.message))

    return () => {
      alive = false
    }
  }, [movieId])

  return (
    <div className="space-y-8">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition-all duration-300 hover:gap-3 hover:text-slate-950"
      >
        <span className="text-lg">←</span>
        Back to movies
      </Link>

      <section className="page-panel fade-up px-6 py-8 md:px-10 md:py-10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <div className="hero-chip">Choose Showtime</div>
            <h2 className="section-title max-w-2xl">Available Shows</h2>
            <p className="section-copy max-w-xl">
              Compare theater, timing, and language details before choosing your
              seats.
            </p>
            {movie?.languages?.length ? (
              <div className="flex flex-wrap gap-2">
                {movie.languages.map((language) => (
                  <span
                    key={language}
                    className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-medium text-slate-600"
                  >
                    {language}
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-sky-100 bg-sky-50/90 px-4 py-4 shadow-sm">
              <div className="text-xs uppercase tracking-[0.18em] text-slate-400">
                Experience
              </div>
              <div className="mt-2 text-sm font-semibold text-slate-900">
                Light, focused booking flow
              </div>
            </div>
            <div className="rounded-2xl border border-violet-100 bg-violet-50/90 px-4 py-4 shadow-sm">
              <div className="text-xs uppercase tracking-[0.18em] text-slate-400">
                Next step
              </div>
              <div className="mt-2 text-sm font-semibold text-slate-900">
                Pick the show that fits your plans
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="space-y-2">
        <h3 className="text-2xl font-semibold tracking-tight text-slate-950 md:text-3xl">
          Available Shows
        </h3>
        <p className="section-copy">Choose a showtime and book your seats</p>
      </div>

      {err && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 shadow-sm">
          {err}
        </div>
      )}

      {shows.length === 0 ? (
        <div className="soft-card border-dashed p-10 text-center text-slate-500">
          No shows available
        </div>
      ) : (
        <div className="space-y-4">
          {shows.map((s) => (
            <div key={s.id} className="soft-card overflow-hidden p-5 md:p-6">
              <div className="grid gap-6 md:grid-cols-[1.1fr_1fr_auto] md:items-center">
                <div className="space-y-3">
                  <div className="text-xs uppercase tracking-[0.22em] text-slate-400">
                    Theater
                  </div>
                  <div className="text-lg font-semibold text-slate-950">
                    {s.Hall?.Theater?.name}
                  </div>
                  <div className="inline-flex rounded-full border border-amber-100 bg-amber-50 px-3 py-1 text-xs font-medium text-slate-600">
                    Hall: {s.Hall?.name}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-1">
                  <div>
                    <div className="text-xs uppercase tracking-[0.22em] text-slate-400">
                      Showtime
                    </div>
                    <div className="mt-2 text-sm font-semibold text-slate-900">
                      {new Date(s.startsAt).toLocaleString()}
                    </div>
                    <div className="mt-1 text-sm text-slate-500">
                      Ends at {new Date(s.endsAt).toLocaleTimeString()}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs uppercase tracking-[0.22em] text-slate-400">
                      Language
                    </div>
                    <div className="mt-2 text-sm font-semibold text-slate-900">
                      {s.language}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-start gap-3 md:items-end">
                  <div className="rounded-2xl border border-pink-100 bg-gradient-to-r from-pink-50 to-orange-50 px-4 py-3 text-sm text-slate-600 shadow-sm">
                    Continue to seat selection for this experience.
                  </div>
                  <Link
                    to={`/shows/${s.id}/seats`}
                    className="primary-button min-w-32"
                  >
                    View seats
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
