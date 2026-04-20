import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { formatDateTimeTo12Hour } from '../lib/time'

export default function Home() {
  const [movies, setMovies] = useState([])
  const [filters, setFilters] = useState({ languages: [], cities: [] })
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [language, setLanguage] = useState('')
  const [city, setCity] = useState('')
  const [duration, setDuration] = useState('')

  useEffect(() => {
    let alive = true
    setLoading(true)

    const params = new URLSearchParams()
    if (search.trim()) params.set('search', search.trim())
    if (language) params.set('language', language)
    if (city) params.set('city', city)
    if (duration) params.set('duration', duration)

    api(`/public/movies${params.toString() ? `?${params.toString()}` : ''}`)
      .then((response) => {
        if (!alive) return
        setMovies(response.movies || [])
        setFilters(response.filters || { languages: [], cities: [] })
        setErr('')
        setLoading(false)
      })
      .catch((e) => {
        if (!alive) return
        setErr(e.message)
        setLoading(false)
      })

    return () => {
      alive = false
    }
  }, [search, language, city, duration])

  return (
    <div className="space-y-8">
      <section className="page-panel fade-up overflow-hidden px-6 py-8 md:px-10 md:py-12">
        <div className="grid items-center gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-5">
            {/* <div className="hero-chip">Now Showing</div> */}
            <div className="space-y-3">
              <h2 className="section-title max-w-2xl">
                Book Your Movie Tickets in Seconds
              </h2>
              <p className="section-copy max-w-xl">
                Browse movies, compare showtimes, and reserve your seats in simple steps.
              </p>
            </div>

            <div className="flex flex-wrap gap-3 text-sm text-slate-500">
              <div className="rounded-full border border-blue-100 bg-zinc-50/90 px-4 py-2 shadow-sm">
                Smooth seat selection
              </div>
              <div className="rounded-full border border-blue-100 bg-zinc-50/90 px-4 py-2 shadow-sm">
                Quick checkout
              </div>
              <div className="rounded-full border border-blue-100 bg-zinc-50/90 px-4 py-2 shadow-sm">
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
                    <div className="mt-2 text-xl font-semibold text-slate-950">
                      From Screen to Seat, Instantly
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  {['Browse', 'Select', 'Book'].map((label, index) => (
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
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="fade-up space-y-2">
        <h3 className="text-2xl font-semibold tracking-tight text-slate-950 md:text-3xl">
          Discover movies
        </h3>
        <p className="section-copy">
          Browse and book shows from currently available titles.
        </p>
      </div>

      <section className="soft-card p-5 md:p-6">
        <div className="grid gap-4 lg:grid-cols-[2fr_repeat(3,1fr)]">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by movie title, description, city, or language"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
          />
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-all duration-200 focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
          >
            <option value="">All languages</option>
            {filters.languages.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-all duration-200 focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
          >
            <option value="">All cities</option>
            {filters.cities.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <select
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-all duration-200 focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
          >
            <option value="">Any duration</option>
            <option value="short">Under 120 mins</option>
            <option value="medium">120 to 150 mins</option>
            <option value="long">Over 150 mins</option>
          </select>
        </div>
      </section>

      {err ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 shadow-sm">
          {err}
        </div>
      ) : null}

      {loading ? (
        <div className="soft-card border-dashed p-10 text-center text-slate-500">
          Loading movies...
        </div>
      ) : movies.length === 0 ? (
        <div className="soft-card border-dashed p-10 text-center text-slate-500">
          No movies matched your search.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {movies.map((movie) => (
            <div key={movie.id} className="soft-card group overflow-hidden">
              <div className="relative h-52 overflow-hidden bg-slate-100">
                <img
                  src={movie.posterUrl || '/fallback_poster.jpeg'}
                  alt={movie.title}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  onError={(e) => {
                    if (e.currentTarget.dataset.fallbackApplied === 'true') {
                      e.currentTarget.style.display = 'none'
                      return
                    }
                    e.currentTarget.dataset.fallbackApplied = 'true'
                    e.currentTarget.src = '/fallback_poster.jpeg'
                  }}
                />

                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/82 via-slate-900/30 to-transparent" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.18),transparent_40%)]" />
                <div className="absolute -bottom-6 -right-6 h-28 w-28 rounded-full bg-white/20 blur-2xl transition-all duration-300 group-hover:scale-110" />

                <div className="relative flex h-full items-end justify-between p-5">
                  <div className="max-w-[70%]">
                    <div className="text-xs uppercase tracking-[0.22em] text-blue-100">
                      Featured title
                    </div>
                    <div className="mt-2 line-clamp-2 text-xl font-semibold text-white">
                      {movie.title}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/20 bg-white/12 px-4 py-3 backdrop-blur-md">
                    <div className="text-xs uppercase tracking-[0.22em] text-blue-100">
                      Duration
                    </div>
                    <div className="mt-2 text-2xl font-semibold text-white">
                      {movie.durationMins}
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
                    {movie.title}
                  </h3>
                </div>

                {/* <p className="text-sm leading-6 text-slate-500">
                  {movie.description || 'Pick a showtime, choose your seats, and complete your booking.'}
                </p> */}

                <div className="space-y-2 text-sm text-slate-500">
                  <div>
                    <span className="font-medium text-slate-700">Languages:</span>{' '}
                    {(movie.languages || []).join(', ') || 'TBA'}
                  </div>
                  <div>
                    <span className="font-medium text-slate-700">Cities:</span>{' '}
                    {(movie.cities || []).join(', ') || 'TBA'}
                  </div>
                  {/* <div>
                    <span className="font-medium text-slate-700">Next show:</span>{' '}
                    {movie.nextShowAt ? formatDateTimeTo12Hour(movie.nextShowAt) : 'Coming soon'}
                  </div> */}
                </div>

                <Link
                  to={`/movies/${movie.id}`}
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
