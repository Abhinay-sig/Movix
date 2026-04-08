import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'

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
      .then((d) => {
        if (!alive) return
        setMovies(d.movies || [])
        setFilters(d.filters || { languages: [], cities: [] })
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
      <h2 className="text-4xl font-bold text-white mb-8">Discover Movies</h2>
      {err ? <div className="text-red-400 bg-red-900/20 p-4 rounded-lg border border-red-900 mb-6">{err}</div> : null}

      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="grid grid-cols-1 lg:grid-cols-[2fr_repeat(3,1fr)] gap-4">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by movie title, description, city, or language"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Any duration</option>
            <option value="short">Under 120 mins</option>
            <option value="medium">120 to 150 mins</option>
            <option value="long">Over 150 mins</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-gray-300 text-lg bg-white/10 p-8 rounded-lg text-center">Loading movies...</div>
      ) : movies.length === 0 ? (
        <div className="text-gray-300 text-lg bg-white/10 p-8 rounded-lg text-center">No movies matched your search.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {movies.map((m) => (
            <div key={m.id} className="bg-white rounded-xl shadow-md hover:shadow-xl transition-shadow overflow-hidden group cursor-pointer">
              <div className="bg-gradient-to-br from-blue-400 to-purple-500 h-48 flex items-center justify-center text-white text-opacity-20">
                <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                </svg>
              </div>
              <div className="p-6">
                <h3 className="font-bold text-gray-900 text-lg mb-2 group-hover:text-blue-600 transition-colors line-clamp-2">{m.title}</h3>
                <p className="text-gray-600 text-sm mb-3">{m.durationMins} mins</p>
                <div className="space-y-2 mb-4 text-sm text-gray-600">
                  <div>
                    <span className="font-medium text-gray-700">Languages:</span> {m.languages.join(', ')}
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Cities:</span> {m.cities.join(', ')}
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Next show:</span>{' '}
                    {m.nextShowAt ? new Date(m.nextShowAt).toLocaleString() : 'Coming soon'}
                  </div>
                </div>
                <Link to={`/movies/${m.id}`} className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold transition-colors">
                  View shows
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
