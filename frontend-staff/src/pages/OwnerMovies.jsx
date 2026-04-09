import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../AuthContext'

export default function OwnerMovies() {
  const { auth } = useAuth()
  const [movies, setMovies] = useState([])
  const [nameFilter, setNameFilter] = useState('')
  const [genreFilter, setGenreFilter] = useState('')
  const [releaseDateFilter, setReleaseDateFilter] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    const params = new URLSearchParams()
    if (nameFilter.trim()) params.set('name', nameFilter.trim())
    if (genreFilter.trim()) params.set('genre', genreFilter.trim())
    if (releaseDateFilter.trim()) params.set('releaseDate', releaseDateFilter.trim())
    const suffix = params.toString() ? `?${params.toString()}` : ''

    api(`/owner/me/movies${suffix}`, { token: auth.token })
      .then((data) => {
        if (!alive) return
        setMovies(data.movies || [])
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
  }, [auth.token, nameFilter, genreFilter, releaseDateFilter])

  return (
    <div className="space-y-8">
      <h2 className="text-4xl font-bold text-white">Movie catalog</h2>
      {err ? <div className="text-red-400 bg-red-900/20 p-4 rounded-lg border border-red-900">{err}</div> : null}

      <div className="bg-white rounded-xl shadow-lg p-8">
        <div className="text-lg font-bold text-gray-900 mb-2">Admin managed movies</div>
        <div className="text-sm text-gray-600">
          Movies are created by admins and become available here for show scheduling after they are added to the catalog.
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-gray-700 font-medium mb-2">Movie Name</label>
            <input
              value={nameFilter}
              onChange={(e) => setNameFilter(e.target.value)}
              placeholder="Movie name"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-gray-700 font-medium mb-2">Genre</label>
            <input
              value={genreFilter}
              onChange={(e) => setGenreFilter(e.target.value)}
              placeholder="Genre"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-gray-700 font-medium mb-2">Release Date</label>
            <input
              type="date"
              value={releaseDateFilter}
              onChange={(e) => setReleaseDateFilter(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-xl font-bold text-white">Available movies</h3>
        {loading ? (
          <div className="text-gray-300 bg-white/10 p-6 rounded-lg text-center">Loading movies…</div>
        ) : movies.length === 0 ? (
          <div className="text-gray-300 bg-white/10 p-6 rounded-lg text-center">No movies available yet.</div>
        ) : (
          <div className="grid gap-4">
            {movies.map((movie) => (
              <div key={movie.id} className="bg-white rounded-xl shadow-md p-6">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div className="space-y-2">
                    <div className="text-xl font-bold text-gray-900">{movie.title}</div>
                    <div className="text-sm text-gray-600">
                      {movie.genre} • {movie.durationMins} mins • Release{' '}
                      {new Date(movie.releaseDate).toLocaleDateString()}
                      {movie.description ? ` • ${movie.description}` : ''}
                    </div>
                    <div className="text-xs text-gray-500">
                      Added on {new Date(movie.addedAt).toLocaleDateString()} • Used in {movie.showCount} show
                      {movie.showCount === 1 ? '' : 's'}
                    </div>
                  </div>
                  {movie.posterUrl ? (
                    <a
                      href={movie.posterUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 hover:text-blue-700 font-medium"
                    >
                      View poster
                    </a>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
