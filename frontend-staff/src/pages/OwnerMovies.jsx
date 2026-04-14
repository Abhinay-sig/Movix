import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../AuthContext'
import PaginationControls from '../components/PaginationControls'

const PAGE_LIMIT = 6

export default function OwnerMovies() {
  const { auth } = useAuth()
  const [movies, setMovies] = useState([])
  const [pagination, setPagination] = useState(null)
  const [nameFilter, setNameFilter] = useState('')
  const [genreFilter, setGenreFilter] = useState('')
  const [releaseDateFilter, setReleaseDateFilter] = useState('')
  const [languageFilter, setLanguageFilter] = useState('')
  const [page, setPage] = useState(1)
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('')

  const activeFilterCount = [nameFilter, genreFilter, releaseDateFilter, languageFilter, timeRange].filter((value) =>
    String(value || '').trim()
  ).length

  const visibleMovies = movies

  useEffect(() => {
    setPage(1)
  }, [nameFilter, genreFilter, releaseDateFilter, languageFilter, timeRange])

  useEffect(() => {
    let alive = true
    setLoading(true)

    const params = new URLSearchParams({
      page: String(page),
      limit: String(PAGE_LIMIT),
    })
    if (nameFilter.trim()) params.set('name', nameFilter.trim())
    if (genreFilter.trim()) params.set('genre', genreFilter.trim())
    if (releaseDateFilter.trim()) params.set('releaseDate', releaseDateFilter.trim())
    if (languageFilter.trim()) params.set('language', languageFilter.trim())
    if (timeRange.trim()) params.set('timeRange', timeRange.trim())

    api(`/owner/me/movies?${params.toString()}`, { token: auth.token })
      .then((data) => {
        if (!alive) return
        setMovies(data.movies || [])
        setPagination(data.pagination || null)
        setErr('')
      })
      .catch((e) => {
        if (!alive) return
        setErr(e.message)
      })
      .finally(() => {
        if (alive) setLoading(false)
      })

    return () => {
      alive = false
    }
  }, [auth.token, nameFilter, genreFilter, releaseDateFilter, languageFilter, timeRange, page])

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-xl bg-white shadow-lg">
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-800 px-8 py-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <div className="inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-200">
                Owner Workspace
              </div>
              <h2 className="text-4xl font-bold text-white">Movie catalog</h2>
              <p className="max-w-2xl text-sm text-slate-300">
                Browse admin-managed movies, review availability, and prepare titles for show scheduling.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
                <div className="text-xs font-medium uppercase tracking-[0.18em] text-slate-300">
                  Total Movies
                </div>
                <div className="mt-2 text-3xl font-bold text-white">
                  {pagination?.total ?? movies.length}
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
                <div className="text-xs font-medium uppercase tracking-[0.18em] text-slate-300">
                  Current Page
                </div>
                <div className="mt-2 text-3xl font-bold text-white">
                  {pagination?.page ?? page}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200 px-8 py-5">
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
            <div className="font-medium text-slate-700">
              Available Movies
            </div>
            <div className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {activeFilterCount} active filter{activeFilterCount === 1 ? '' : 's'}
            </div>
          </div>
        </div>
      </section>

      {err ? <div className="text-red-400 bg-red-900/20 p-4 rounded-lg border border-red-900">{err}</div> : null}

      <div className="overflow-hidden rounded-xl bg-white shadow-lg">
        <div className="border-b border-slate-200 px-6 py-5">
          <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-lg font-bold text-gray-900">Filters</div>
            <div className="text-sm text-gray-500">
              Refine the catalog instantly and review matching titles in real time.
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                setNameFilter('')
                setGenreFilter('')
                setReleaseDateFilter('')
                setLanguageFilter('')
                setTimeRange('')
              }}
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-5 py-2.5 text-sm font-semibold text-slate-700 transition-all duration-200 hover:bg-slate-100"
            >
              Clear All
            </button>
          </div>
        </div>
        </div>

        <div className="bg-slate-50/70 px-6 py-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div>
            <label className="block text-gray-700 font-medium mb-2">Movie Name</label>
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-400">
                Name
              </span>
              <input
                value={nameFilter}
                onChange={(e) => setNameFilter(e.target.value)}
                placeholder="Movie name"
                className="w-full rounded-xl border border-gray-300 bg-white py-3 pl-18 pr-4 text-slate-900 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-gray-700 font-medium mb-2">Genre</label>
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-400">
                Genre
              </span>
              <input
                value={genreFilter}
                onChange={(e) => setGenreFilter(e.target.value)}
                placeholder="Genre"
                className="w-full rounded-xl border border-gray-300 bg-white py-3 pl-20 pr-4 text-slate-900 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-gray-700 font-medium mb-2">Release Date</label>
            <input
              type="date"
              value={releaseDateFilter}
              onChange={(e) => setReleaseDateFilter(e.target.value)}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-slate-900 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-gray-700 font-medium mb-2">Language</label>
            <input
              value={languageFilter}
              onChange={(e) => setLanguageFilter(e.target.value)}
              placeholder="Language"
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-slate-900 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-gray-700 font-medium mb-2">Show Movies From</label>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-slate-900 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Time</option>
              <option value="today">Today</option>
              <option value="last7">Last 7 Days</option>
              <option value="last30">Last 30 Days</option>
            </select>
          </div>
        </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col gap-2 rounded-xl bg-white p-6 shadow-lg md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-xl font-bold text-black">Available movies</h3>
            <p className="text-sm text-slate-500">
              {visibleMovies.length} movies ready for review and scheduling.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="overflow-hidden rounded-xl bg-white p-6 shadow-md">
                <div className="flex flex-col gap-4 md:flex-row">
                  <div className="h-40 w-full animate-pulse rounded-xl bg-gradient-to-br from-slate-200 to-slate-100 md:w-28" />
                  <div className="flex-1 space-y-3">
                    <div className="h-7 w-2/3 animate-pulse rounded-lg bg-slate-200" />
                    <div className="h-5 w-1/2 animate-pulse rounded-lg bg-slate-200" />
                    <div className="flex gap-2">
                      <div className="h-8 w-20 animate-pulse rounded-full bg-slate-200" />
                      <div className="h-8 w-24 animate-pulse rounded-full bg-slate-200" />
                    </div>
                    <div className="h-4 w-full animate-pulse rounded-lg bg-slate-200" />
                    <div className="h-4 w-4/5 animate-pulse rounded-lg bg-slate-200" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : visibleMovies.length === 0 ? (
          <div className="rounded-xl bg-white p-10 text-center shadow-lg">
            <div className="text-5xl">🎬</div>
            <div className="mt-4 text-xl font-bold text-slate-900">No movies found</div>
            <div className="mt-2 text-sm text-slate-500">Try adjusting filters</div>
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              {visibleMovies.map((movie) => (
                <div
                  key={movie.id}
                  className="overflow-hidden rounded-xl border border-slate-200 bg-white p-6 shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl"
                >
                  <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                    <div className="flex flex-1 flex-col gap-4 md:flex-row">
                      {movie.posterUrl ? (
                        <img
                          src={movie.posterUrl}
                          alt={movie.title}
                          className="h-44 w-full rounded-xl object-cover shadow-sm md:w-30"
                        />
                      ) : (
                        <div className="flex h-44 w-full items-center justify-center rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 text-4xl text-slate-400 md:w-30">
                          🎬
                        </div>
                      )}

                      <div className="space-y-4">
                        <div>
                          <div className="text-xl font-bold text-gray-900">{movie.title}</div>
                          <div className="mt-1 text-sm text-gray-500">
                            Release {new Date(movie.releaseDate).toLocaleDateString()}
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                            Genre: {String(movie.genre || '').trim() || 'Not Available'}
                          </span>
                          <span className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                            Duration: {movie.durationMins ? `${movie.durationMins} mins` : 'Not Available'}
                          </span>
                          <span className="rounded-full border border-amber-100 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                            Shows: {movie.showCount}
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {(movie.languages || []).filter(Boolean).length ? (
                            (movie.languages || []).filter(Boolean).map((language) => (
                              <span
                                key={`${movie.id}-${language}`}
                                className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700"
                              >
                                {language}
                              </span>
                            ))
                          ) : (
                            <span className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                              Not Available
                            </span>
                          )}
                        </div>

                        <div className="max-w-2xl text-sm leading-6 text-gray-600">
                          {movie.description || 'No description available for this movie.'}
                        </div>

                        <div className="text-xs text-gray-500">
                          Added on {new Date(movie.addedAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <PaginationControls pagination={pagination} onPageChange={setPage} />
          </>
        )}
      </div>
    </div>
  )
}
