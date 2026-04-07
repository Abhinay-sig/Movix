import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../lib/api'

export default function MovieShows() {
  const { movieId } = useParams()
  const [shows, setShows] = useState([])
  const [err, setErr] = useState('')

  useEffect(() => {
    let alive = true
    api(`/public/movies/${movieId}/shows`)
      .then((d) => alive && setShows(d.shows || []))
      .catch((e) => alive && setErr(e.message))
    return () => {
      alive = false
    }
  }, [movieId])

  return (
    <div>
      <div className="flex items-center gap-4 mb-8">
        <Link to="/" className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-2 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to movies
        </Link>
      </div>
      <h2 className="text-4xl font-bold text-white mb-8">Available Shows</h2>
      {err ? <div className="text-red-400 bg-red-900/20 p-4 rounded-lg border border-red-900 mb-6">{err}</div> : null}
      {shows.length === 0 ? (
        <div className="text-gray-300 text-lg bg-white/10 p-8 rounded-lg text-center">No shows available</div>
      ) : (
        <div className="space-y-4">
          {shows.map((s) => (
            <div key={s.id} className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow overflow-hidden">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6">
                <div>
                  <div className="text-sm text-gray-500 mb-1">Theater</div>
                  <div className="font-bold text-gray-900">{s.Hall?.Theater?.name}</div>
                  <div className="text-gray-600 text-sm mt-3">Hall: {s.Hall?.name}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 mb-1">Showtime</div>
                  <div className="font-bold text-gray-900">{new Date(s.startsAt).toLocaleString()}</div>
                  <div className="text-gray-600 text-sm mt-1">Ending at {new Date(s.endsAt).toLocaleTimeString()}</div>
                </div>
                <div className="flex items-end justify-between md:justify-start gap-3">
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Language</div>
                    <div className="font-semibold text-gray-900 mb-3">{s.language}</div>
                  </div>
                  <Link to={`/shows/${s.id}/seats`} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors">
                    Book seats
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

