import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../AuthContext'

const EMPTY_FORM = {
  title: '',
  genre: '',
  releaseDate: '',
  description: '',
  durationMins: '',
  posterUrl: '',
}

export default function AdminAddMovie() {
  const { auth } = useAuth()
  const navigate = useNavigate()
  const { id } = useParams()

  const isEdit = Boolean(id)

  const [form, setForm] = useState(EMPTY_FORM)
  const [savingMovie, setSavingMovie] = useState(false)
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  useEffect(() => {
    if (!isEdit) return

    setLoading(true)
    api(`/admin/movies/${id}`, { token: auth.token })
      .then((res) => {
        const m = res.movie
        setForm({
          title: m.title || '',
          genre: m.genre || '',
          releaseDate: m.releaseDate || '',
          description: m.description || '',
          durationMins: m.durationMins || '',
          posterUrl: m.posterUrl || '',
        })
      })
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false))
  }, [id, isEdit, auth.token])

  async function submitMovie(e) {
    e.preventDefault()
    setErr('')

    const title = form.title.trim()
    const genre = form.genre.trim()
    const description = form.description.trim()
    const posterUrl = form.posterUrl.trim()

    if (!title || !/[a-zA-Z0-9]/.test(title)) {
      setErr('Enter a valid movie title')
      return
    }

    if (!genre || !/[a-zA-Z0-9]/.test(genre)) {
      setErr('Enter a valid genre')
      return
    }

    if (!form.releaseDate) {
      setErr('Release date is required')
      return
    }

    if (!form.durationMins || Number(form.durationMins) <= 0) {
      setErr('Enter valid duration')
      return
    }

    if (posterUrl) {
      try {
        new URL(posterUrl)
      } catch {
        setErr('Invalid poster URL')
        return
      }
    }

    setSavingMovie(true)

    try {
      if (isEdit) {
        await api(`/admin/movies/${id}`, {
          method: 'PATCH',
          token: auth.token,
          body: {
            title,
            genre,
            releaseDate: form.releaseDate,
            description,
            durationMins: Number(form.durationMins),
            posterUrl,
          },
        })
      } else {
        await api('/admin/movies', {
          method: 'POST',
          token: auth.token,
          body: {
            title,
            genre,
            releaseDate: form.releaseDate,
            description,
            durationMins: Number(form.durationMins),
            posterUrl,
          },
        })
      }

      setForm(EMPTY_FORM)
      navigate('/admin/movies', { replace: true })
    } catch (e2) {
      setErr(e2.message)
    } finally {
      setSavingMovie(false)
    }
  }

  return (
    <div>
      <h2 className="text-4xl font-bold text-white mb-8">
        {isEdit ? 'Edit movie' : 'Add movie'}
      </h2>

      {err ? (
        <div className="text-red-400 bg-red-900/20 p-4 rounded-lg border border-red-900 mb-6">
          {err}
        </div>
      ) : null}

      {loading ? (
        <div className="text-gray-300">Loading...</div>
      ) : (
        <div className="bg-white rounded-xl shadow-lg p-8">
          <form onSubmit={submitMovie} className="space-y-4 max-w-3xl">

            {/* TITLE + GENRE */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-700 font-medium mb-2">Movie Title</label>
                <input
                  placeholder="Movie title"
                  value={form.title}
                  onChange={(e) => updateField('title', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-2">Genre</label>
                <input
                  placeholder="Genre"
                  value={form.genre}
                  onChange={(e) => updateField('genre', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            {/* DURATION + DATE */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-700 font-medium mb-2">Duration (minutes)</label>
                <input
                  type="number"
                  min="1"
                  max="480"
                  placeholder="Duration in minutes"
                  value={form.durationMins}
                  onChange={(e) => updateField('durationMins', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-2">Release Date</label>
                <input
                  type="date"
                  value={form.releaseDate}
                  onChange={(e) => updateField('releaseDate', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            {/* POSTER */}
            <div>
              <label className="block text-gray-700 font-medium mb-2">Poster URL (optional)</label>
              <input
                placeholder="Poster URL (optional)"
                value={form.posterUrl}
                onChange={(e) => updateField('posterUrl', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* DESCRIPTION */}
            <div>
              <label className="block text-gray-700 font-medium mb-2">Description (optional)</label>
              <textarea
                placeholder="Description (optional)"
                value={form.description}
                onChange={(e) => updateField('description', e.target.value)}
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex gap-3">
              <button
                disabled={savingMovie}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-lg transition-colors disabled:opacity-50"
              >
                {savingMovie
                  ? isEdit
                    ? 'Updating…'
                    : 'Saving…'
                  : isEdit
                  ? 'Update movie'
                  : 'Create movie'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/admin/movies')}
                className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded-lg transition-colors"
              >
                Close
              </button>
            </div>

          </form>
        </div>
      )}
    </div>
  )
}
