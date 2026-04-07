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
    <div>
      <h2 className="text-4xl font-bold text-white mb-8">Discover Movies</h2>
      {err ? <div className="text-red-400 bg-red-900/20 p-4 rounded-lg border border-red-900 mb-6">{err}</div> : null}
      {movies.length === 0 ? (
        <div className="text-gray-300 text-lg bg-white/10 p-8 rounded-lg text-center">Loading movies...</div>
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
                <p className="text-gray-600 text-sm mb-4">{m.durationMins} mins</p>
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

