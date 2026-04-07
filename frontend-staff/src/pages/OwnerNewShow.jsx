import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../AuthContext'

const TYPES = ['standard', 'premium', 'recliner', 'vip']

export default function OwnerNewShow() {
  const { auth } = useAuth()
  const [halls, setHalls] = useState([])
  const [movies, setMovies] = useState([])
  const [err, setErr] = useState('')

  const [hallId, setHallId] = useState('')
  const [movieId, setMovieId] = useState('')
  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [durationMins, setDurationMins] = useState('')
  const [language, setLanguage] = useState('English')
  const [prices, setPrices] = useState(() => Object.fromEntries(TYPES.map((t) => [t, ''])))

  const [schedule, setSchedule] = useState(null)
  const [hasConflict, setHasConflict] = useState(false)

  useEffect(() => {
    Promise.all([
      api('/owner/me/halls', { token: auth.token }),
      api('/public/movies'),
    ])
      .then(([h, m]) => {
        setHalls(h.halls || [])
        setMovies(m.movies || [])
      })
      .catch((e) => setErr(e.message))
  }, [auth.token])

  useEffect(() => {
    if (hallId && date) {
      api(`/owner/halls/${hallId}/schedule?date=${date}`, { token: auth.token })
        .then((data) => {
          setSchedule(data)
          checkConflicts()
        })
        .catch((e) => setErr(e.message))
    } else {
      setSchedule(null)
    }
  }, [hallId, date, auth.token])

  useEffect(() => {
    checkConflicts()
  }, [schedule, startTime, durationMins])

  function checkConflicts() {
    if (!schedule || !startTime || !durationMins) {
      setHasConflict(false)
      return
    }

    const proposedStart = new Date(`${date}T${startTime}`)
    const proposedEnd = new Date(proposedStart.getTime() + durationMins * 60000)
    const bufferMins = schedule.bufferMins || 30

    const conflict = schedule.schedule.some(show => {
      const showStart = new Date(show.startsAt)
      const showEnd = new Date(show.endsAt)
      const bufferedStart = new Date(showStart.getTime() - bufferMins * 60000)
      const bufferedEnd = new Date(showEnd.getTime() + bufferMins * 60000)

      return proposedStart < bufferedEnd && proposedEnd > bufferedStart
    })

    setHasConflict(conflict)
  }

  async function submit(e) {
    e.preventDefault()
    setErr('')
    if (hasConflict) {
      setErr('Cannot create show: conflicts with existing schedule')
      return
    }
    try {
      const seatPrices = TYPES.filter((t) => prices[t]).map((t) => ({
        seatTypeCode: t,
        price: Number(prices[t]),
      }))
      await api('/owner/shows', {
        method: 'POST',
        token: auth.token,
        body: { hallId: Number(hallId), movieId: Number(movieId), date, startTime, durationMins: Number(durationMins), language, seatPrices },
      })
      alert('Show submitted for admin approval.')
      setHallId('')
      setMovieId('')
      setDate('')
      setStartTime('')
      setDurationMins('')
    } catch (e2) {
      setErr(e2.message)
    }
  }

  return (
    <div>
      <h2 className="text-4xl font-bold text-white mb-8">Add show</h2>
      {err ? <div className="text-red-400 bg-red-900/20 p-4 rounded-lg border border-red-900 mb-6">{err}</div> : null}
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-4xl">
        <form onSubmit={submit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-gray-700 font-medium mb-2">Select hall</label>
              <select value={hallId} onChange={(e) => setHallId(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select hall…</option>
                {halls.map((h) => (
                  <option key={h.id} value={h.id}>
                    #{h.id} {h.Theater?.name} — {h.name} {h.isApproved ? '' : '(pending)'}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-gray-700 font-medium mb-2">Select movie</label>
              <select value={movieId} onChange={(e) => setMovieId(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select movie…</option>
                {movies.map((m) => (
                  <option key={m.id} value={m.id}>
                    #{m.id} {m.title}
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
                onChange={(e) => setDurationMins(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. 120"
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
                    step="0.01"
                    min="0"
                    placeholder="Price"
                    value={prices[t]}
                    onChange={(e) => setPrices((p) => ({ ...p, [t]: e.target.value }))}
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
                  ⚠️ Proposed show conflicts with existing schedule
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
          Buffer rule: new show must have a 30-min gap before/after any existing show in the same hall.
        </div>
      </div>
    </div>
  )
}

function Timeline({ schedule, proposedStart, proposedDuration, date }) {
  const bufferMins = schedule.bufferMins || 30
  const dayStart = new Date(`${date}T00:00`)
  const dayEnd = new Date(`${date}T23:59`)

  // Calculate proposed show times
  let proposedShow = null
  if (proposedStart && proposedDuration) {
    const start = new Date(`${date}T${proposedStart}`)
    const end = new Date(start.getTime() + proposedDuration * 60000)
    proposedShow = { start, end }
  }

  // Create timeline segments
  const segments = []
  let currentTime = new Date(dayStart)

  // Sort shows by start time
  const sortedShows = [...schedule.schedule].sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt))

  for (const show of sortedShows) {
    const showStart = new Date(show.startsAt)
    const showEnd = new Date(show.endsAt)
    const bufferStart = new Date(showStart.getTime() - bufferMins * 60000)
    const bufferEnd = new Date(showEnd.getTime() + bufferMins * 60000)

    // Add free time before buffer
    if (currentTime < bufferStart) {
      segments.push({
        type: 'free',
        start: new Date(currentTime),
        end: new Date(bufferStart),
      })
      currentTime = bufferStart
    }

    // Add buffer time
    if (currentTime < showStart) {
      segments.push({
        type: 'buffer',
        start: new Date(currentTime),
        end: new Date(showStart),
      })
      currentTime = showStart
    }

    // Add show time
    if (currentTime < showEnd) {
      segments.push({
        type: 'booked',
        start: new Date(currentTime),
        end: new Date(showEnd),
        show,
      })
      currentTime = showEnd
    }

    // Add buffer after show
    if (currentTime < bufferEnd) {
      segments.push({
        type: 'buffer',
        start: new Date(currentTime),
        end: new Date(bufferEnd),
      })
      currentTime = bufferEnd
    }
  }

  // Add remaining free time
  if (currentTime < dayEnd) {
    segments.push({
      type: 'free',
      start: new Date(currentTime),
      end: new Date(dayEnd),
    })
  }

  // Add proposed show if it exists
  if (proposedShow) {
    segments.push({
      type: 'proposed',
      start: proposedShow.start,
      end: proposedShow.end,
    })
  }

  // Sort all segments by start time
  segments.sort((a, b) => a.start - b.start)

  return (
    <div className="border rounded-lg p-4 bg-gray-50">
      <div className="flex flex-wrap gap-2 text-xs mb-4">
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-blue-200 rounded"></div>
          <span>Free</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-orange-200 rounded"></div>
          <span>Buffer</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-red-200 rounded"></div>
          <span>Booked</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-green-200 rounded"></div>
          <span>Proposed</span>
        </div>
      </div>
      <div className="flex flex-wrap gap-1">
        {segments.map((segment, index) => {
          const duration = (segment.end - segment.start) / (1000 * 60) // minutes
          if (duration <= 0) return null

          let bgColor = 'bg-gray-200'
          let text = ''
          if (segment.type === 'free') bgColor = 'bg-blue-200'
          else if (segment.type === 'buffer') bgColor = 'bg-orange-200'
          else if (segment.type === 'booked') {
            bgColor = 'bg-red-200'
            text = `${segment.show.movieTitle} (${segment.show.language})`
          } else if (segment.type === 'proposed') {
            bgColor = 'bg-green-200'
            text = 'Proposed Show'
          }

          const startTime = segment.start.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
          const endTime = segment.end.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })

          return (
            <div
              key={index}
              className={`flex flex-col justify-center items-center p-2 rounded text-xs min-w-[80px] ${bgColor}`}
              style={{ flex: duration / 60 }} // Scale by hours
            >
              <div className="font-medium">{startTime} - {endTime}</div>
              {text && <div className="text-center mt-1">{text}</div>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

