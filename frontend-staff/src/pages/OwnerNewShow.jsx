import { useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../AuthContext'

const TYPES = ['standard', 'premium', 'recliner', 'vip']

export default function OwnerNewShow() {
  const { auth } = useAuth()
  const [theaters, setTheaters] = useState([])
  const [hallsByTheater, setHallsByTheater] = useState({})
  const [movies, setMovies] = useState([])
  const [err, setErr] = useState('')

  const [theaterId, setTheaterId] = useState('')
  const [hallId, setHallId] = useState('')
  const [movieId, setMovieId] = useState('')
  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [durationMins, setDurationMins] = useState('')
  const [language, setLanguage] = useState('English')
  const [prices, setPrices] = useState(() => Object.fromEntries(TYPES.map((t) => [t, ''])))

  const [schedule, setSchedule] = useState(null)
  const [hasConflict, setHasConflict] = useState(false)
  const [loadingHalls, setLoadingHalls] = useState(false)

  useEffect(() => {
    Promise.all([
      api('/owner/me/theaters', { token: auth.token }),
      api('/owner/me/movies', { token: auth.token }),
    ])
      .then(([t, m]) => {
        setTheaters(t.theaters || [])
        setMovies(m.movies || [])
      })
      .catch((e) => setErr(e.message))
  }, [auth.token])

  const filteredHalls = useMemo(() => hallsByTheater[theaterId] || [], [hallsByTheater, theaterId])

  useEffect(() => {
    if (!theaterId) {
      setHallId('')
      setSchedule(null)
    }
  }, [theaterId])

  useEffect(() => {
    if (!theaterId) return
    setHallId('')
    setSchedule(null)

    if (hallsByTheater[theaterId]) return

    let alive = true
    setLoadingHalls(true)
    api(`/owner/theaters/${theaterId}/halls`, { token: auth.token })
      .then((response) => {
        if (!alive) return
        setHallsByTheater((prev) => ({ ...prev, [theaterId]: response.halls || [] }))
        setErr('')
      })
      .catch((e) => {
        if (!alive) return
        setErr(e.message)
      })
      .finally(() => {
        if (alive) setLoadingHalls(false)
      })

    return () => {
      alive = false
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.token, theaterId])

  useEffect(() => {
    if (hallId && date) {
      api(`/owner/halls/${hallId}/schedule?date=${date}`, { token: auth.token })
        .then((data) => {
          setSchedule(data)
          setErr('')
        })
        .catch((e) => setErr(e.message))
    } else {
      setSchedule(null)
    }
  }, [hallId, date, auth.token])

  useEffect(() => {
    checkConflicts()
  }, [schedule, startTime, durationMins, date])

  useEffect(() => {
    const selectedMovie = movies.find((movie) => String(movie.id) === String(movieId))
    if (selectedMovie) {
      setDurationMins(String(selectedMovie.durationMins))
      if (date && date < selectedMovie.releaseDate) {
        setErr('Cannot schedule a show before the movie release date')
      }
    } else if (!movieId) {
      setDurationMins('')
    }
  }, [date, movieId, movies])

  function checkConflicts() {
    if (!schedule || !date || !startTime || !durationMins) {
      setHasConflict(false)
      return
    }

    const proposedStart = new Date(`${date}T${startTime}:00`)
    const proposedEnd = new Date(proposedStart.getTime() + durationMins * 60000)

    const conflict = schedule.schedule.some(show => {
      const bufferedStart = new Date(show.bufferStart)
      const bufferedEnd = new Date(show.bufferEnd)
      return proposedStart < bufferedEnd && proposedEnd > bufferedStart
    })

    setHasConflict(conflict)
  }

  async function submit(e) {
    e.preventDefault()
    setErr('')

    if (!theaterId || !hallId || !movieId || !date || !startTime || !language || !durationMins) {
      setErr('Please fill all required fields before creating the show.')
      return
    }

    const selectedMovie = movies.find((movie) => String(movie.id) === String(movieId))
    if (selectedMovie && date < selectedMovie.releaseDate) {
      setErr('Cannot schedule a show before the movie release date')
      return
    }

    if (hasConflict) {
      setErr('Time conflicts with another show (including buffer)')
      return
    }

    try {
      const seatPrices = TYPES.filter((t) => prices[t]).map((t) => ({
        seatTypeCode: t,
        price: Number(prices[t]),
      }))
      const ticketPrice = seatPrices.length ? Math.min(...seatPrices.map((item) => item.price)) : 150
      const payload = {
        hallId: Number(hallId),
        movieId: Number(movieId),
        date,
        startTime,
        language,
        ticketPrice,
      }
      if (Number.isFinite(Number(durationMins)) && Number(durationMins) > 0) {
        payload.durationMins = Number(durationMins)
      }
      if (seatPrices.length) {
        payload.seatPrices = seatPrices
      }
      console.log('FINAL PAYLOAD:', payload)

      await api('/owner/shows', {
        method: 'POST',
        token: auth.token,
        body: payload,
      })
      alert('Show submitted for admin approval.')
      setTheaterId('')
      setHallId('')
      setMovieId('')
      setDate('')
      setStartTime('')
      setDurationMins('')
      setLanguage('English')
      setPrices(Object.fromEntries(TYPES.map((t) => [t, ''])))
      setSchedule(null)
    } catch (e2) {
  console.error(e2)
  setErr(e2.message || 'Something went wrong')
}
  }

  return (
    <div>
      <h2 className="text-4xl font-bold text-white mb-8">Schedule show</h2>
      {err ? <div className="text-red-400 bg-red-900/20 p-4 rounded-lg border border-red-900 mb-6">{err}</div> : null}
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-4xl">
        <form onSubmit={submit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-gray-700 font-medium mb-2">Select theater</label>
              <select value={theaterId} onChange={(e) => setTheaterId(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required>
                <option value="">Select theater…</option>
                {theaters.map((theater) => (
                  <option key={theater.id} value={theater.id}>
                    #{theater.id} {theater.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-2">Select hall</label>
              <select value={hallId} onChange={(e) => setHallId(e.target.value)} disabled={!theaterId || loadingHalls} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400" required>
                <option value="">
                  {!theaterId ? 'Select theater first' : loadingHalls ? 'Loading halls…' : 'Select hall…'}
                </option>
                {filteredHalls.map((h) => (
                  <option key={h.id} value={h.id}>
                    #{h.id} {h.name} {h.isApproved ? '' : '(pending)'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-2">Select movie</label>
              <select value={movieId} onChange={(e) => setMovieId(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required>
                <option value="">Select an available movie…</option>
                {movies.map((m) => (
                  <option key={m.id} value={m.id}>
                    #{m.id} {m.title} ({m.durationMins} mins)
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-gray-700 font-medium mb-2">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                min={movies.find((movie) => String(movie.id) === String(movieId))?.releaseDate || undefined}
                required
              />
            </div>
            <div>
              <label className="block text-gray-700 font-medium mb-2">Start Time</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-gray-700 font-medium mb-2">Duration (minutes)</label>
              <input
                type="number"
                min="1"
                max="480"
                value={durationMins}
                readOnly
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Select a movie first"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-2">Language</label>
            <input 
              value={language} 
              onChange={(e) => setLanguage(e.target.value)} 
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" 
              required
            />
          </div>

          <div>
            <label className="block text-gray-700 font-bold mb-4">Seat prices (must be ≤ admin cap)</label>
            <div className="grid grid-cols-2 gap-4">
              {TYPES.map((t) => (
                <label key={t} className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-gray-700 capitalize">{t}</span>
                 <input
  type="number"
  step="1"
  min="0"
  placeholder="Price"
  value={prices[t]}
  onChange={(e) => setPrices((p) => ({ ...p, [t]: e.target.value }))}
  onWheel={(e) => e.target.blur()}   // ✅ stops scroll change
  onKeyDown={(e) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault()             // ✅ stops arrow key change
    }
  }}
  className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
/>
                </label>
              ))}
            </div>
          </div>

          {schedule && (
            <div>
              <label className="block text-gray-700 font-bold mb-4">Hall Schedule for {date}</label>
              <Timeline schedule={schedule} proposedStart={startTime} proposedDuration={durationMins} date={date} />
              {hasConflict && (
                <div className="mt-2 text-red-600 font-medium">
                  Time conflicts with another show (including buffer)
                </div>
              )}
            </div>
          )}

          <button 
            type="submit"
            disabled={hasConflict}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold py-3 rounded-lg transition-colors"
          >
            Create show request
          </button>
        </form>
        <div className="mt-6 text-sm text-gray-600 bg-blue-50 p-4 rounded-lg">
          Buffer rule: new show must have a 30-min gap before and after any existing show in the same hall. Movies are created by admins and can only be scheduled on or after their release date.
        </div>
      </div>
    </div>
  )
}

function Timeline({ schedule, proposedStart, proposedDuration, date }) {
  const dayStart = new Date(`${date}T00:00:00`)
  const dayEnd = new Date(`${date}T23:59:59`)
  const totalMs = dayEnd.getTime() - dayStart.getTime()

  function toPct(value) {
    return ((value.getTime() - dayStart.getTime()) / totalMs) * 100
  }

  const blocks = []
  for (const show of schedule.schedule) {
    const startsAt = new Date(show.startsAt)
    const endsAt = new Date(show.endsAt)
    const bufferStart = new Date(show.bufferStart)
    const bufferEnd = new Date(show.bufferEnd)

    blocks.push({
      type: 'buffer',
      start: bufferStart,
      end: startsAt,
      label: 'Buffer',
    })
    blocks.push({
      type: 'show',
      start: startsAt,
      end: endsAt,
      label: show.movieTitle,
    })
    blocks.push({
      type: 'buffer',
      start: endsAt,
      end: bufferEnd,
      label: 'Buffer',
    })
  }

  if (proposedStart && proposedDuration) {
    const proposedStartDate = new Date(`${date}T${proposedStart}:00`)
    const proposedEndDate = new Date(proposedStartDate.getTime() + Number(proposedDuration) * 60000)
    blocks.push({
      type: 'proposed',
      start: proposedStartDate,
      end: proposedEndDate,
      label: 'Proposed show',
    })
  }

  const hours = Array.from({ length: 25 }, (_, index) => `${String(index).padStart(2, '0')}:00`)

  return (
    <div className="border rounded-lg p-4 bg-gray-50">
      <div className="flex flex-wrap gap-3 text-xs mb-4">
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-emerald-100 border border-emerald-200 rounded"></div>
          <span>Free space</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-amber-300 rounded"></div>
          <span>30 min buffer</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-blue-500 rounded"></div>
          <span>Show block</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-violet-500 rounded"></div>
          <span>Proposed show</span>
        </div>
      </div>
      <div className="relative">
        <div className="relative h-16 rounded-lg border border-emerald-200 bg-emerald-100 overflow-hidden">
          {blocks.map((block, index) => {
            const width = Math.max(toPct(block.end) - toPct(block.start), 0.5)
            const style = {
              left: `${Math.max(toPct(block.start), 0)}%`,
              width: `${Math.min(width, 100)}%`,
            }

            let className = 'absolute top-2 h-12 rounded text-white text-[10px] flex items-center justify-center px-2 overflow-hidden'
            if (block.type === 'buffer') className += ' bg-amber-300 text-amber-950'
            if (block.type === 'show') className += ' bg-blue-500'
            if (block.type === 'proposed') className += ' bg-violet-500'

            return (
              <div key={`${block.type}-${index}`} className={className} style={style} title={`${block.label}: ${formatTime(block.start)} - ${formatTime(block.end)}`}>
                <span className="truncate">
                  {block.label} {formatTime(block.start)} - {formatTime(block.end)}
                </span>
              </div>
            )
          })}
        </div>

        <div className="relative mt-2 h-5">
          {hours.map((hour, index) => (
            <div key={hour} className="absolute top-0 text-[10px] text-gray-500 -translate-x-1/2" style={{ left: `${(index / 24) * 100}%` }}>
              {hour}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function formatTime(value) {
  return value.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
}
