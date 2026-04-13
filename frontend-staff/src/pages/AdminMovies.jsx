import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../AuthContext'
import Modal from '../components/Modal'
import PaginationControls from '../components/PaginationControls'

const PAGE_LIMIT = 5

export default function AdminMovies() {
  const { auth } = useAuth()
  const navigate = useNavigate()

  const [movies, setMovies] = useState([])
  const [pagination, setPagination] = useState(null)
  const [nameFilter, setNameFilter] = useState('')
  const [genreFilter, setGenreFilter] = useState('')
  const [releaseDateFilter, setReleaseDateFilter] = useState('')
  const [languageFilter, setLanguageFilter] = useState('')
  const [durationFilter, setDurationFilter] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)

  useEffect(() => {
    setPage(1)
  }, [nameFilter, genreFilter, releaseDateFilter, languageFilter, durationFilter])

  function clearFilters() {
    setNameFilter('')
    setGenreFilter('')
    setReleaseDateFilter('')
    setLanguageFilter('')
    setDurationFilter('')
  }

  useEffect(() => {
    if (!auth?.token) return

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
    if (durationFilter.trim()) params.set('duration', durationFilter.trim())

    api(`/admin/movies?${params.toString()}`, { token: auth.token })
      .then((res) => {
        if (!alive) return
        setMovies(res.movies || [])
        setPagination(res.pagination || null)
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
  }, [auth?.token, nameFilter, genreFilter, releaseDateFilter, languageFilter, durationFilter, page])

  async function confirmDelete() {
    if (!deleteTarget) return

    try {
      await api(`/admin/movies/${deleteTarget.id}`, {
        method: 'DELETE',
        token: auth.token,
      })

      setMovies((prev) => prev.filter((movie) => movie.id !== deleteTarget.id))
      if (movies.length === 1 && page > 1) {
        setPage((prev) => prev - 1)
      }
      setDeleteTarget(null)
    } catch (e) {
      setErr(e.message)
    }
  }

  return (
    <div>
      <h2 className="text-4xl font-bold text-black mb-8">Movies</h2>

      {err ? (
        <div className="text-red-400 bg-red-900/20 p-4 rounded-lg border border-red-900 mb-6">
          {err}
        </div>
      ) : null}

      <div className="mb-6">
        <button
          onClick={() => navigate('/admin/movies/new')}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-lg transition-colors"
        >
          Add Movie
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-lg font-bold text-gray-900">Filters</div>
            <div className="text-sm text-gray-500">Narrow the movie list by name, genre, or release date.</div>
          </div>
          <button
            type="button"
            onClick={clearFilters}
            className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-gray-50 px-5 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-100"
          >
            Clear All
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
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
          <div>
            <label className="block text-gray-700 font-medium mb-2">Language</label>
            <input
              value={languageFilter}
              onChange={(e) => setLanguageFilter(e.target.value)}
              placeholder="Language"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-gray-700 font-medium mb-2">Duration</label>
            <input
              type="number"
              min="1"
              step="1"
              value={durationFilter}
              onChange={(e) => setDurationFilter(e.target.value)}
              placeholder="Duration in minutes"
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
              <div>
                <div className="text-xl font-bold text-gray-900">{movie.title}</div>
                <div className="text-gray-600">
                  {movie.genre} • {movie.durationMins} mins
                </div>
                <div className="text-gray-500 text-sm">Release: {movie.releaseDate}</div>
                <div className="text-gray-500 text-sm">
                  Languages: {(movie.languages || []).join(', ') || 'English'}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => navigate(`/admin/movies/${movie.id}/edit`)}
                  className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg font-medium"
                >
                  Edit
                </button>

                <button
                  onClick={() => setDeleteTarget(movie)}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}

          <PaginationControls pagination={pagination} onPageChange={setPage} />
        </div>
      )}

      <Modal
        open={Boolean(deleteTarget)}
        title={deleteTarget ? `Delete ${deleteTarget.title}` : 'Delete movie'}
        onClose={() => setDeleteTarget(null)}
        footer={
          <>
            <button
              type="button"
              onClick={() => setDeleteTarget(null)}
              className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-700 transition-all duration-200 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmDelete}
              className="inline-flex items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 px-5 py-3 text-sm font-medium text-rose-700 transition-all duration-200 hover:bg-rose-100"
            >
              Confirm delete
            </button>
          </>
        }
      >
        <div className="text-sm text-slate-600">
          Are you sure you want to delete <span className="font-medium text-slate-900">{deleteTarget?.title}</span>?
        </div>
      </Modal>
    </div>
  )
}
