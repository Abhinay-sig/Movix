import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../AuthContext'
import {
  extractFieldErrors,
  validateNameField,
  validatePositiveNumberField,
  withFieldError,
} from '../lib/formErrors'

const LANGUAGE_OPTIONS = ['English', 'Hindi', 'Tamil', 'Telugu']

const EMPTY_FORM = {
  title: '',
  genre: '',
  releaseDate: '',
  description: '',
  durationMins: '',
  posterUrl: '',
  languages: ['English'],
}

export default function AdminAddMovie() {
  const { auth } = useAuth()
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = Boolean(id)

  const [form, setForm] = useState(EMPTY_FORM)
  const [fieldErrors, setFieldErrors] = useState({})
  const [savingMovie, setSavingMovie] = useState(false)
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }))
    setFieldErrors((prev) => ({ ...prev, [key]: '' }))
  }

  function toggleLanguage(language) {
    setForm((prev) => {
      const hasLanguage = prev.languages.includes(language)
      const languages = hasLanguage
        ? prev.languages.filter((item) => item !== language)
        : [...prev.languages, language]
      return {
        ...prev,
        languages,
      }
    })
    setFieldErrors((prev) => ({ ...prev, languages: '' }))
  }

  useEffect(() => {
    if (!isEdit) return

    setLoading(true)
    api(`/admin/movies/${id}`, { token: auth.token })
      .then((res) => {
        const movie = res.movie
        setForm({
          title: movie.title || '',
          genre: movie.genre || '',
          releaseDate: movie.releaseDate || '',
          description: movie.description || '',
          durationMins: movie.durationMins || '',
          posterUrl: movie.posterUrl || '',
          languages: movie.languages?.length ? movie.languages : ['English'],
        })
        setErr('')
      })
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false))
  }, [auth.token, id, isEdit])

  function validateForm() {
    const nextErrors = {}
    const title = form.title.trim()
    const genre = form.genre.trim()
    const description = form.description.trim()
    const posterUrl = form.posterUrl.trim()

    const titleError = validateNameField(title, 'Movie title')
    if (titleError) nextErrors.title = titleError

    if (!genre || !/[a-zA-Z0-9]/.test(genre)) {
      nextErrors.genre = 'Enter a valid genre.'
    }

    if (!form.releaseDate) {
      nextErrors.releaseDate = 'Release date is required.'
    }

    const durationError = validatePositiveNumberField(form.durationMins, 'Duration')
    if (durationError) nextErrors.durationMins = durationError

    if (posterUrl) {
      try {
        new URL(posterUrl)
      } catch {
        nextErrors.posterUrl = 'Enter a valid poster URL.'
      }
    }

    if (!form.languages.length) {
      nextErrors.languages = 'Choose at least one language.'
    }

    if (description.length > 5000) {
      nextErrors.description = 'Description is too long.'
    }

    return nextErrors
  }

  async function submitMovie(e) {
    e.preventDefault()
    setErr('')

    const nextErrors = validateForm()
    setFieldErrors(nextErrors)
    if (Object.keys(nextErrors).length) return

    setSavingMovie(true)

    try {
      const payload = {
        title: form.title.trim(),
        genre: form.genre.trim(),
        releaseDate: form.releaseDate,
        description: form.description.trim(),
        durationMins: Number(form.durationMins),
        posterUrl: form.posterUrl.trim(),
        languages: form.languages,
      }

      if (isEdit) {
        await api(`/admin/movies/${id}`, {
          method: 'PATCH',
          token: auth.token,
          body: payload,
        })
      } else {
        await api('/admin/movies', {
          method: 'POST',
          token: auth.token,
          body: payload,
        })
      }

      setForm(EMPTY_FORM)
      navigate('/admin/movies', { replace: true })
    } catch (e2) {
      const nextServerErrors = extractFieldErrors(e2)
      if (Object.keys(nextServerErrors).length) {
        setFieldErrors(nextServerErrors)
      } else {
        setErr(e2.message)
      }
    } finally {
      setSavingMovie(false)
    }
  }

  const inputClass =
    'w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'

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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-700 font-medium mb-2">Movie Title</label>
                <input
                  placeholder="Movie title"
                  value={form.title}
                  onChange={(e) => updateField('title', e.target.value)}
                  className={withFieldError(inputClass, Boolean(fieldErrors.title))}
                  required
                />
                {fieldErrors.title ? (
                  <div className="mt-2 text-sm text-red-600">{fieldErrors.title}</div>
                ) : null}
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-2">Genre</label>
                <input
                  placeholder="Genre"
                  value={form.genre}
                  onChange={(e) => updateField('genre', e.target.value)}
                  className={withFieldError(inputClass, Boolean(fieldErrors.genre))}
                  required
                />
                {fieldErrors.genre ? (
                  <div className="mt-2 text-sm text-red-600">{fieldErrors.genre}</div>
                ) : null}
              </div>
            </div>

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
                  className={withFieldError(inputClass, Boolean(fieldErrors.durationMins))}
                  required
                />
                {fieldErrors.durationMins ? (
                  <div className="mt-2 text-sm text-red-600">{fieldErrors.durationMins}</div>
                ) : null}
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-2">Release Date</label>
                <input
                  type="date"
                  value={form.releaseDate}
                  onChange={(e) => updateField('releaseDate', e.target.value)}
                  className={withFieldError(inputClass, Boolean(fieldErrors.releaseDate))}
                  required
                />
                {fieldErrors.releaseDate ? (
                  <div className="mt-2 text-sm text-red-600">{fieldErrors.releaseDate}</div>
                ) : null}
              </div>
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-2">Languages</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {LANGUAGE_OPTIONS.map((language) => (
                  <label
                    key={language}
                    className={`flex items-center gap-3 rounded-lg border px-4 py-3 ${
                      fieldErrors.languages ? 'border-red-300' : 'border-gray-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={form.languages.includes(language)}
                      onChange={() => toggleLanguage(language)}
                    />
                    <span className="text-sm text-gray-700">{language}</span>
                  </label>
                ))}
              </div>
              {fieldErrors.languages ? (
                <div className="mt-2 text-sm text-red-600">{fieldErrors.languages}</div>
              ) : null}
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-2">Poster URL (optional)</label>
              <input
                placeholder="Poster URL (optional)"
                value={form.posterUrl}
                onChange={(e) => updateField('posterUrl', e.target.value)}
                className={withFieldError(inputClass, Boolean(fieldErrors.posterUrl))}
              />
              {fieldErrors.posterUrl ? (
                <div className="mt-2 text-sm text-red-600">{fieldErrors.posterUrl}</div>
              ) : null}
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-2">Description (optional)</label>
              <textarea
                placeholder="Description (optional)"
                value={form.description}
                onChange={(e) => updateField('description', e.target.value)}
                rows={4}
                className={withFieldError(inputClass, Boolean(fieldErrors.description))}
              />
              {fieldErrors.description ? (
                <div className="mt-2 text-sm text-red-600">{fieldErrors.description}</div>
              ) : null}
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
