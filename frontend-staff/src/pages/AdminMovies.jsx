import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../AuthContext'

export default function AdminMovies() {
  const { auth } = useAuth()
  const navigate = useNavigate()

  const [movies, setMovies] = useState([])
  const [nameFilter, setNameFilter] = useState('')
  const [genreFilter, setGenreFilter] = useState('')
  const [releaseDateFilter, setReleaseDateFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')

  // ✅ FETCH MOVIES
  async function loadMovies() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (nameFilter.trim()) params.set('name', nameFilter.trim())
      if (genreFilter.trim()) params.set('genre', genreFilter.trim())
      if (releaseDateFilter.trim()) params.set('releaseDate', releaseDateFilter.trim())
      const suffix = params.toString() ? `?${params.toString()}` : ''
      const res = await api(`/admin/movies${suffix}`, { token: auth.token })
      setMovies(res.movies || [])
      setErr('')
    } catch (e) {
      setErr(e.message)
    } finally {
      setLoading(false)
    }
  }

 useEffect(() => {
  if (auth?.token) {
    loadMovies()
  }
}, [auth.token, nameFilter, genreFilter, releaseDateFilter])
  // ✅ DELETE MOVIE
  async function handleDelete(id) {
    const confirmDelete = window.confirm('Are you sure you want to delete this movie?')
    if (!confirmDelete) return

    try {
      await api(`/admin/movies/${id}`, {
        method: 'DELETE',
        token: auth.token,
      })

      // refresh list
      setMovies((prev) => prev.filter((m) => m.id !== id))
    } catch (e) {
      alert(e.message)
    }
  }

  return (
    <div>
      <h2 className="text-4xl font-bold text-white mb-8">Movies</h2>

      {err ? (
        <div className="text-red-400 bg-red-900/20 p-4 rounded-lg border border-red-900 mb-6">
          {err}
        </div>
      ) : null}

      {/* ✅ ADD MOVIE BUTTON */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/admin/movies/new')}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-lg transition-colors"
        >
          Add Movie
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
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

      {loading ? (
        <div className="text-gray-300 text-lg">Loading…</div>
      ) : movies.length === 0 ? (
        <div className="text-gray-300">No movies found.</div>
      ) : (
        <div className="space-y-4">
          {movies.map((movie) => (
            <div
              key={movie.id}
              className="bg-white rounded-xl shadow-lg p-6 flex justify-between items-center"
            >
              {/* LEFT SIDE */}
              <div>
                <div className="text-xl font-bold text-gray-900">
                  {movie.title}
                </div>
                <div className="text-gray-600">
                  {movie.genre} • {movie.durationMins} mins
                </div>
                <div className="text-gray-500 text-sm">
                  Release: {movie.releaseDate}
                </div>
              </div>

              {/* RIGHT SIDE */}
              <div className="flex gap-3">
                {/* EDIT */}
                <button
                  onClick={() => navigate(`/admin/movies/${movie.id}/edit`)}
                  className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg font-medium"
                >
                  Edit
                </button>

                {/* DELETE */}
                <button
                  onClick={() => handleDelete(movie.id)}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
