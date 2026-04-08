import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'

export default function Home() {
  const [movies, setMovies] = useState([])
  const [err, setErr] = useState('')

  useEffect(() => {
    let alive = true
    api('/public/movies')
      .then((d) => {
        if (alive) setMovies(d.movies || [])
      })
      .catch((e) => alive && setErr(e.message))

    return () => {
      alive = false
    }
  }, [])

  return (
    <div className="space-y-8">
      <section className="page-panel fade-up overflow-hidden px-6 py-8 md:px-10 md:py-12">
        <div className="grid items-center gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-5">
            <div className="hero-chip">Now Showing</div>
            <div className="space-y-3">
              <h2 className="section-title max-w-2xl">
                Discover movies in a cleaner, calmer booking flow.
              </h2>
              <p className="section-copy max-w-xl">
                Browse what is playing, compare showtimes, and lock in your seats
                with a light, polished interface designed to feel effortless.
              </p>
            </div>

            <div className="flex flex-wrap gap-3 text-sm text-slate-500">
              <div className="rounded-full border border-blue-100 bg-blue-50/90 px-4 py-2 shadow-sm">
                Smooth seat selection
              </div>
              <div className="rounded-full border border-violet-100 bg-violet-50/90 px-4 py-2 shadow-sm">
                Quick checkout
              </div>
              <div className="rounded-full border border-amber-100 bg-amber-50/90 px-4 py-2 shadow-sm">
                Live show listings
              </div>
            </div>
          </div>

          <div className="fade-up-delay relative">
            <div className="absolute inset-x-10 top-8 h-32 rounded-full bg-gradient-to-r from-sky-200/60 via-fuchsia-200/50 to-amber-200/60 blur-3xl" />
            <div className="soft-card relative overflow-hidden p-6">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-violet-50" />
              <div className="relative space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs uppercase tracking-[0.24em] text-slate-400">
                      Featured experience
                    </div>
                    <div className="mt-2 text-xl font-semibold text-slate-950">
                      Cinema, simplified
                    </div>
                  </div>
                  <div className="h-12 w-12 rounded-2xl bg-slate-950 shadow-lg shadow-slate-300/70" />
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  {['Browse', 'Choose', 'Enjoy'].map((label, index) => (
                    <div
                      key={label}
                    className="rounded-2xl border border-white/70 bg-gradient-to-br from-white to-blue-50 p-4 shadow-sm"
                    >
                      <div className="text-xs uppercase tracking-[0.2em] text-slate-400">
                        0{index + 1}
                      </div>
                      <div className="mt-3 text-sm font-semibold text-slate-900">
                        {label}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                  <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-slate-950 via-blue-500 to-sky-300" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="fade-up space-y-2">
        <h3 className="text-2xl font-semibold tracking-tight text-slate-950 md:text-3xl">
          Discover Movies
        </h3>
        <p className="section-copy">
          Browse and book shows from currently available titles.
        </p>
      </div>

      {err && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 shadow-sm">
          {err}
        </div>
      )}

      {movies.length === 0 ? (
        <div className="soft-card border-dashed p-10 text-center text-slate-500">
          Loading movies...
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {movies.map((m) => (
            <div key={m.id} className="soft-card group overflow-hidden">
              <div className="relative h-52 overflow-hidden bg-gradient-to-br from-slate-950 via-slate-800 to-blue-500">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.18),transparent_40%)]" />
                <div className="absolute -bottom-6 -right-6 h-28 w-28 rounded-full bg-white/20 blur-2xl transition-all duration-300 group-hover:scale-110" />
                <div className="relative flex h-full items-end p-5">
                  <div className="rounded-2xl border border-white/20 bg-white/12 px-4 py-3 backdrop-blur-md">
                    <div className="text-xs uppercase tracking-[0.22em] text-blue-100">
                      Duration
                    </div>
                    <div className="mt-2 text-2xl font-semibold text-white">
                      {m.durationMins}
                      <span className="ml-1 text-sm font-medium text-blue-100">
                        mins
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4 p-5">
                <div className="space-y-2">
                  <div className="inline-flex rounded-full bg-gradient-to-r from-blue-50 to-violet-50 px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-violet-100">
                    Booking open
                  </div>
                  <h3 className="line-clamp-2 text-lg font-semibold text-slate-950">
                    {m.title}
                  </h3>
                </div>

                <p className="text-sm leading-6 text-slate-500">
                  Pick a showtime, select seats, and confirm in just a few taps.
                </p>

                <Link
                  to={`/movies/${m.id}`}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-slate-950 transition-all duration-300 group-hover:text-blue-600"
                >
                  View shows
                  <span className="transition-transform duration-300 group-hover:translate-x-1">
                    →
                  </span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
