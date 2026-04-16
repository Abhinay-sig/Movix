import { useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api'
import Modal from '../components/Modal'
import PaginationControls from '../components/PaginationControls'
import { validatePositiveNumberField, withFieldError } from '../lib/formErrors'
import { formatTo12Hour } from '../lib/time'
import { useAuth } from '../useAuth'

const TYPES = ['standard', 'premium', 'recliner', 'vip']
const SHOWS_PAGE_LIMIT = 6

function toDateInputValue(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function toWallClockUtc(date, time) {
  return new Date(`${date}T${time}:00.000Z`)
}

function isPastDateTime(date, time) {
  if (!date || !time) return false
  const value = toWallClockUtc(date, time)
  if (Number.isNaN(value.getTime())) return false
  return value.getTime() < Date.now()
}

function getTodayDateInputValue() {
  return toDateInputValue(new Date())
}

function getMaxShowDateInputValue() {
  const next = new Date()
  next.setDate(next.getDate() + 7)
  return toDateInputValue(next)
}

export default function OwnerNewShow() {
  const { auth } = useAuth()
  const [theaters, setTheaters] = useState([])
  const [halls, setHalls] = useState([])
  const [movies, setMovies] = useState([])
  const [err, setErr] = useState('')
  const [notice, setNotice] = useState('')
  const [showApprovalModal, setShowApprovalModal] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})

  const [theaterId, setTheaterId] = useState('')
  const [hallId, setHallId] = useState('')
  const [movieId, setMovieId] = useState('')
  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [durationMins, setDurationMins] = useState('')
  const [language, setLanguage] = useState('English')
  const [prices, setPrices] = useState(() =>
    Object.fromEntries(TYPES.map((type) => [type, '']))
  )

  const [schedule, setSchedule] = useState(null)
  const [viewDate, setViewDate] = useState(new Date().toISOString().split("T")[0])
  const [viewTheaterId, setViewTheaterId] = useState('')
  const [viewHallId, setViewHallId] = useState('')
  const [viewMovieId, setViewMovieId] = useState('')
  const [viewStatus, setViewStatus] = useState('all')
  const [viewTimeSlot, setViewTimeSlot] = useState('all')
  const [ownerShows, setOwnerShows] = useState([])
  const [showsPagination, setShowsPagination] = useState(null)
  const [showsPage, setShowsPage] = useState(1)
  const [loadingOwnerShows, setLoadingOwnerShows] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [showToDelete, setShowToDelete] = useState(null)
  const [deletingShow, setDeletingShow] = useState(false)
  const [alertMessage, setAlertMessage] = useState('')

  useEffect(() => {
    Promise.all([
      api('/owner/me/theaters', { token: auth.token }),
      api('/owner/me/halls', { token: auth.token }),
      api('/owner/me/movies', { token: auth.token }),
    ])
      .then(([theatersResponse, hallsResponse, moviesResponse]) => {
        setTheaters(theatersResponse.theaters || [])
        setHalls(hallsResponse.halls || [])
        setMovies(moviesResponse.movies || [])
        setErr('')
      })
      .catch((e) => setErr(e.message))
  }, [auth.token])

  const filteredHalls = useMemo(
    () =>
      theaterId
        ? halls.filter((hall) => String(hall.theaterId) === String(theaterId))
        : [],
    [halls, theaterId]
  )

  const viewFilteredHalls = useMemo(
    () =>
      viewTheaterId
        ? halls.filter(
            (hall) =>
              String(hall.theaterId) === String(viewTheaterId) &&
              hall.isApproved &&
              !hall.isBlocked
          )
        : [],
    [halls, viewTheaterId]
  )

  const selectedMovie = useMemo(
    () => movies.find((movie) => String(movie.id) === String(movieId)) || null,
    [movieId, movies]
  )

  const availableLanguages = useMemo(() => {
    const movieLanguages = Array.isArray(selectedMovie?.languages)
      ? selectedMovie.languages
          .map((entry) => String(entry || '').trim())
          .filter(Boolean)
      : []

    return movieLanguages.length ? movieLanguages : ['English']
  }, [selectedMovie])

  useEffect(() => {
    if (!selectedMovie) {
      if (!movieId) setDurationMins('')
      return
    }

    setDurationMins(String(selectedMovie.durationMins || ''))
  }, [movieId, selectedMovie])

  useEffect(() => {
    if (!movieId) {
      setLanguage('English')
      return
    }

    if (!availableLanguages.includes(language)) {
      setLanguage(availableLanguages[0] || 'English')
    }
  }, [availableLanguages, language, movieId])

  useEffect(() => {
    setShowsPage(1)
  }, [viewDate, viewTheaterId, viewHallId, viewMovieId, viewStatus, viewTimeSlot])

  function clearShowFilters() {
    setViewDate('')
    setViewTheaterId('')
    setViewHallId('')
    setViewMovieId('')
    setViewStatus('all')
    setViewTimeSlot('all')
  }

  useEffect(() => {
    if (!hallId || !date) {
      setSchedule(null)
      return
    }

    let alive = true

    api(`/owner/halls/${hallId}/schedule?date=${date}`, { token: auth.token })
      .then((response) => {
        if (!alive) return
        setSchedule(response)
        setErr('')
      })
      .catch((e) => {
        if (!alive) return
        setErr(e.message)
      })

    return () => {
      alive = false
    }
  }, [auth.token, hallId, date])

  const hasConflict = useMemo(() => {
    if (!schedule || !date || !startTime || !durationMins) return false

    const proposedStart = toWallClockUtc(date, startTime)
    const proposedEnd = new Date(proposedStart.getTime() + Number(durationMins) * 60000)

    return (schedule.schedule || []).some((show) => {
      const bufferedStart = show.bufferStart
        ? new Date(show.bufferStart)
        : new Date(new Date(show.startsAt).getTime() - (schedule.bufferMins || 30) * 60000)
      const bufferedEnd = show.bufferEnd
        ? new Date(show.bufferEnd)
        : new Date(new Date(show.endsAt).getTime() + (schedule.bufferMins || 30) * 60000)

      return proposedStart < bufferedEnd && proposedEnd > bufferedStart
    })
  }, [schedule, date, startTime, durationMins])

  useEffect(() => {
    const params = new URLSearchParams()
    if (viewDate) {
      params.set('date', viewDate)
    } else {
      params.set('page', String(showsPage))
      params.set('limit', String(SHOWS_PAGE_LIMIT))
    }
    if (viewTheaterId) params.set('theaterId', viewTheaterId)
    if (viewHallId) params.set('hallId', viewHallId)
    if (viewMovieId) params.set('movieId', viewMovieId)
    if (viewStatus && viewStatus !== 'all') params.set('status', viewStatus)
    if (viewTimeSlot && viewTimeSlot !== 'all') params.set('timeSlot', viewTimeSlot)

    let alive = true
    setLoadingOwnerShows(true)

    api(`/owner/shows?${params.toString()}`, { token: auth.token })
      .then((response) => {
        if (!alive) return
        setOwnerShows(response.shows || [])
        setShowsPagination(response.pagination || null)
        setErr('')
      })
      .catch((e) => {
        if (!alive) return
        setErr(e.message)
        setShowsPagination(null)
      })
      .finally(() => {
        if (alive) setLoadingOwnerShows(false)
      })

    return () => {
      alive = false
    }
  }, [
    auth.token,
    viewDate,
    viewTheaterId,
    viewHallId,
    viewMovieId,
    viewStatus,
    viewTimeSlot,
    showsPage,
  ])

  const sortedShows = useMemo(
    () => [...ownerShows].sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt)),
    [ownerShows]
  )

  async function submit(e) {
    e.preventDefault()
    setErr('')
    setNotice('')
    setShowApprovalModal(false)
    setFieldErrors({})
    setAlertMessage('')

    if (!theaterId || !hallId || !movieId || !date || !startTime || !language || !durationMins) {
      setAlertMessage('Please fill all required fields before creating the show.')
      return
    }

    const todayDate = getTodayDateInputValue()
    if (date < todayDate) {
      setAlertMessage('You cannot book past day movie.')
      return
    }

    const maxShowDate = getMaxShowDateInputValue()
    if (date > maxShowDate) {
      setAlertMessage('You cannot book a movie after more than 7 days.')
      return
    }

    const releaseDate = toDateInputValue(selectedMovie?.releaseDate)
    if (releaseDate && date < releaseDate) {
      setAlertMessage('You cannot create or book a show before the movie release date.')
      return
    }

    const nextErrors = {}
    if (isPastDateTime(date, startTime)) {
      nextErrors.startTime = 'Start time cannot be in the past.'
    }

    TYPES.forEach((type) => {
      if (!prices[type]) return
      const priceError = validatePositiveNumberField(prices[type], `${type} price`)
      if (priceError) {
        nextErrors[`price_${type}`] = priceError
      }
    })

    if (Object.keys(nextErrors).length) {
      setFieldErrors(nextErrors)
      setAlertMessage(Object.values(nextErrors)[0])
      return
    }

    const selectedHall = filteredHalls.find((hall) => String(hall.id) === String(hallId))
    if (selectedHall && !selectedHall.isApproved) {
      setAlertMessage('Selected hall is not approved yet.')
      return
    }

    if (hasConflict) {
      setAlertMessage('Time conflicts with another show, including the required buffer window.')
      return
    }

    const seatPrices = TYPES.filter((type) => prices[type]).map((type) => ({
      seatTypeCode: type,
      price: Number(prices[type]),
    }))

    if (seatPrices.length === 0) {
      setAlertMessage('Add at least one seat price before submitting the show.')
      return
    }

    setSubmitting(true)

    try {
      await api('/owner/shows', {
        method: 'POST',
        token: auth.token,
        body: {
          hallId: Number(hallId),
          movieId: Number(movieId),
          date,
          startTime,
          durationMins: Number(durationMins),
          language,
          seatPrices,
        },
      })

      setNotice('Waiting for admin approval')
      setShowApprovalModal(true)
      setFieldErrors({})
      setTheaterId('')
      setHallId('')
      setMovieId('')
      setDate('')
      setStartTime('')
      setDurationMins('')
      setLanguage('English')
      setPrices(Object.fromEntries(TYPES.map((type) => [type, ''])))
      setSchedule(null)
    } catch (e2) {
      if (String(e2?.message || '').includes('Price exceeds admin cap for this seat type')) {
        setAlertMessage('Price exceeds admin cap for this seat type.')
      } else if (String(e2?.message || '').includes('Cannot schedule show in the past')) {
        setAlertMessage('You cannot book past day movie.')
      } else if (String(e2?.message || '').includes('Shows can only be scheduled within next 7 days')) {
        setAlertMessage('You cannot book a movie after more than 7 days.')
      } else if (String(e2?.message || '').includes('Cannot schedule a show before the movie release date')) {
        setAlertMessage('You cannot create or book a show before the movie release date.')
      } else {
        setAlertMessage(e2.message || 'Something went wrong.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function confirmDeleteShow() {
    if (!showToDelete) return

    setDeletingShow(true)
    setErr('')
    setNotice('')
    setAlertMessage('')

    try {
      await api(`/owner/shows/${showToDelete.id}`, {
        method: 'DELETE',
        token: auth.token,
      })

      setOwnerShows((prev) => prev.filter((show) => String(show.id) !== String(showToDelete.id)))
      setShowsPagination((prev) => {
        if (!prev) return prev
        const total = Math.max(0, Number(prev.total || 0) - 1)
        return {
          ...prev,
          total,
        }
      })
      setShowToDelete(null)
    } catch (e) {
      setAlertMessage(e.message || 'Unable to delete the show right now.')
    } finally {
      setDeletingShow(false)
    }
  }

  const fieldClass =
    'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100'
  const selectClass = withFieldError('staff-select', false)

  const panelClass =
    'rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8'

  return (
    <div className="space-y-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-2 text-center">
        <h2 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
          Create showtime
        </h2>
        <p className="text-sm text-slate-500">
          Choose a theater, then one of its halls, and schedule a show without breaking release-date or buffer rules.
        </p>
      </div>

      <div className={`mx-auto max-w-5xl ${panelClass}`}>
        <form onSubmit={submit} className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">
                Choose theater
              </label>
              <select
                value={theaterId}
                onChange={(e) => {
                  setTheaterId(e.target.value)
                  setHallId('')
                  setSchedule(null)
                  setFieldErrors((prev) => ({ ...prev, theaterId: '' }))
                }}
                className={withFieldError(selectClass, Boolean(fieldErrors.theaterId))}
              >
                <option value="">Choose a theater…</option>
                {theaters.map((theater) => (
                  <option key={theater.id} value={theater.id}>
                    {theater.name} • {theater.city}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">
                Choose hall
              </label>
              <select
                value={hallId}
                onChange={(e) => {
                  setHallId(e.target.value)
                  setFieldErrors((prev) => ({ ...prev, hallId: '' }))
                }}
                className={withFieldError(selectClass, Boolean(fieldErrors.hallId))}
                disabled={!theaterId}
              >
                <option value="">
                  {theaterId ? 'Choose a hall…' : 'Choose a theater first…'}
                </option>
                {filteredHalls.map((hall) => (
                  <option key={hall.id} value={hall.id} disabled={!hall.isApproved}>
                    {hall.name} {hall.isApproved ? '' : '(under review)'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">
              Choose Movie
            </label>
            <select
              value={movieId}
              onChange={(e) => {
                setMovieId(e.target.value)
                setFieldErrors((prev) => ({ ...prev, movieId: '' }))
              }}
              className={withFieldError(selectClass, Boolean(fieldErrors.movieId))}
            >
              <option value="">Choose a title…</option>
              {movies.map((movie) => (
                <option key={movie.id} value={movie.id}>
  {movie.title}
</option>
              ))}
            </select>
            {selectedMovie ? (
              <div className="text-xs text-slate-500">
                Release date: {toDateInputValue(selectedMovie.releaseDate)}
              </div>
            ) : null}
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => {
                  setDate(e.target.value)
                  setFieldErrors((prev) => ({ ...prev, date: '', startTime: '' }))
                }}
                className={withFieldError(fieldClass, Boolean(fieldErrors.date))}
                min={toDateInputValue(selectedMovie?.releaseDate) || undefined}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">
                Start time
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => {
                  setStartTime(e.target.value)
                  setFieldErrors((prev) => ({ ...prev, startTime: '' }))
                }}
                className={withFieldError(fieldClass, Boolean(fieldErrors.startTime))}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">
                Duration (minutes)
              </label>
              <input
                type="number"
                min="1"
                max="480"
                value={durationMins}
                readOnly
                className={fieldClass}
                placeholder="Select a movie first"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">
              Language
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className={selectClass}
              required
            >
              {availableLanguages.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-4">
            <div className="text-sm font-medium text-slate-700">
              Seat prices
              <span className="ml-2 font-normal text-slate-500">
                for each show
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {TYPES.map((type) => (
                <label key={type} className="space-y-2">
                  <span className="block text-sm font-medium capitalize text-slate-700">
                    {type}
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Price"
                    value={prices[type]}
                    onChange={(e) => {
                      setPrices((prev) => ({ ...prev, [type]: e.target.value }))
                      setFieldErrors((prev) => ({ ...prev, [`price_${type}`]: '' }))
                    }}
                    onWheel={(e) => e.currentTarget.blur()}
                    onKeyDown={(e) => {
                      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                        e.preventDefault()
                      }
                    }}
                    className={withFieldError(fieldClass, Boolean(fieldErrors[`price_${type}`]))}
                    required
                  />
                </label>
              ))}
            </div>
          </div>

          {schedule ? (
            <div className="space-y-4">
              <div className="text-sm font-medium text-slate-700">
                Day schedule for {date}
              </div>

              <Timeline
                schedule={schedule}
                proposedStart={startTime}
                proposedDuration={durationMins}
                date={date}
              />

              <div className="space-y-2">
                {(schedule.schedule || []).map((show) => (
                  <div
                    key={show.id}
                    className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-sm text-slate-600 md:flex-row md:items-center md:justify-between"
                  >
                    <div className="font-medium text-slate-900">{show.movieTitle}</div>
                    <div>
                      {formatScheduledTime(show.startsAt)} - {formatScheduledTime(show.endsAt)}
                    </div>
                    <div className="text-xs text-slate-500">
                      Buffer: {formatScheduledTime(show.bufferStart)} - {formatScheduledTime(show.bufferEnd)}
                    </div>
                  </div>
                ))}
              </div>

            </div>
          ) : null}

          <button
            type="submit"
            disabled={submitting || hasConflict}
            className="inline-flex w-full items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-blue-600 hover:shadow-md active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? 'Submitting…' : 'Publish showtime'}
          </button>
        </form>

        <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-slate-600">
          The flow is Theater → Hall → Showtime. One theater can have multiple halls, and each hall must keep a 30-minute buffer before and after every scheduled show.
        </div>
      </div>

      <div className={panelClass}>
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <h3 className="text-xl font-semibold text-slate-900">Scheduled shows</h3>
            <p className="text-sm text-slate-500">
              Review the day plan by theater, hall, or movie.
            </p>
          </div>
          <button
            type="button"
            onClick={clearShowFilters}
            className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-5 py-2.5 text-sm font-semibold text-slate-700 transition-all duration-200 hover:bg-slate-100"
          >
            Clear All
          </button>
        </div>

        <section className="rounded-3xl border border-slate-200 bg-slate-50/80 p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-900">Filters</div>
              <div className="text-sm text-slate-500">
                Narrow the schedule by date, theater, hall, or movie.
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">Date</label>
              <input
                type="date"
                value={viewDate}
                onChange={(e) => setViewDate(e.target.value)}
                className={fieldClass}
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">Theater</label>
              <select
                value={viewTheaterId}
                onChange={(e) => {
                  setViewTheaterId(e.target.value)
                  setViewHallId('')
                }}
                className={selectClass}
              >
                <option value="">All theaters</option>
                {theaters.map((theater) => (
                  <option key={theater.id} value={theater.id}>
                    #{theater.id} {theater.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">Hall</label>
              <select
                value={viewHallId}
                onChange={(e) => setViewHallId(e.target.value)}
                disabled={!viewTheaterId}
                className={selectClass}
              >
                <option value="">
                  {!viewTheaterId ? 'Select theater first' : 'All halls'}
                </option>
                {viewFilteredHalls.map((hall) => (
                  <option key={hall.id} value={hall.id}>
                    #{hall.id} {hall.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">Movie</label>
              <select
                value={viewMovieId}
                onChange={(e) => setViewMovieId(e.target.value)}
                className={selectClass}
              >
                <option value="">All movies</option>
                {movies.map((movie) => (
                  <option key={movie.id} value={movie.id}>
                    #{movie.id} {movie.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">Status</label>
              <select
                value={viewStatus}
                onChange={(e) => setViewStatus(e.target.value)}
                className={selectClass}
              >
                <option value="all">All statuses</option>
                <option value="approved">Approved</option>
                <option value="pending">Pending</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">Time Slot</label>
              <select
                value={viewTimeSlot}
                onChange={(e) => setViewTimeSlot(e.target.value)}
                className={selectClass}
              >
                <option value="all">All time slots</option>
                <option value="morning">Morning (6AM - 12PM)</option>
                <option value="afternoon">Afternoon (12PM - 5PM)</option>
                <option value="evening">Evening (5PM - 9PM)</option>
                <option value="night">Night (9PM - 12AM)</option>
              </select>
            </div>
          </div>
        </section>

        <div className="mt-6">
          {loadingOwnerShows ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
              Loading scheduled shows…
            </div>
          ) : sortedShows.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
              No shows scheduled. Try selecting another date.
            </div>
          ) : (
            <div className="grid gap-4">
              {sortedShows.map((show) => (
                <article
                  key={show.id}
                  className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md sm:p-6"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                        <FilmIcon />
                        Movie Name
                      </div>
                      <div className="text-lg font-semibold text-slate-950">
                        {show.movieTitle}
                      </div>
                      <div className="text-sm text-slate-500">
                        Theatre Name: {show.theaterName}
                      </div>
                      <div className="text-sm text-slate-500">
                        Hall Name: {show.hallName}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <span className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
                        <ClockIcon />
                        Show Time: {formatScheduledTime(show.startsAt)} - {formatScheduledTime(show.endsAt)}
                      </span>
                      <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                        <GlobeIcon />
                        Language: {show.language}
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowToDelete(show)}
                        className="rounded-lg bg-red-50 px-3 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-100"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </article>
              ))}

              {!viewDate ? (
                <PaginationControls
                  pagination={showsPagination}
                  onPageChange={(nextPage) => setShowsPage(nextPage)}
                />
              ) : null}
            </div>
          )}
        </div>
      </div>

      <Modal
        open={Boolean(alertMessage)}
        title="Message"
        onClose={() => setAlertMessage('')}
        footer={
          <button
            type="button"
            onClick={() => setAlertMessage('')}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white"
          >
            OK
          </button>
        }
      >
        <div className="text-sm text-slate-600">{alertMessage}</div>
      </Modal>

      <Modal
        open={showApprovalModal}
        title="Showtime submitted"
        onClose={() => setShowApprovalModal(false)}
        footer={
          <button
            type="button"
            onClick={() => setShowApprovalModal(false)}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white"
          >
            Close
          </button>
        }
      >
        <div className="text-sm text-slate-600">Waiting for admin approval</div>
      </Modal>

      <Modal
        open={Boolean(showToDelete)}
        title="Delete Show"
        onClose={() => {
          if (deletingShow) return
          setShowToDelete(null)
        }}
        footer={
          <>
            <button
              type="button"
              onClick={() => setShowToDelete(null)}
              disabled={deletingShow}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmDeleteShow}
              disabled={deletingShow}
              className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white"
            >
              {deletingShow ? 'Deleting…' : 'Confirm Delete'}
            </button>
          </>
        }
      >
        <div className="text-sm text-slate-600">Are you sure you want to delete this show?</div>
      </Modal>
    </div>
  )
}

function Timeline({ schedule, proposedStart, proposedDuration, date }) {
  const dayStart = new Date(`${date}T00:00:00.000Z`)
  const dayEnd = new Date(`${date}T23:59:59.999Z`)

  const proposedShow =
    proposedStart && proposedDuration
      ? {
          start: toWallClockUtc(date, proposedStart),
          end: new Date(toWallClockUtc(date, proposedStart).getTime() + Number(proposedDuration) * 60000),
        }
      : null

  const segments = []
  let currentTime = new Date(dayStart)
  const sortedShows = [...(schedule.schedule || [])].sort(
    (a, b) => new Date(a.startsAt) - new Date(b.startsAt)
  )

  for (const show of sortedShows) {
    const showStart = new Date(show.startsAt)
    const showEnd = new Date(show.endsAt)
    const bufferStart = new Date(show.bufferStart)
    const bufferEnd = new Date(show.bufferEnd)

    if (currentTime < bufferStart) {
      segments.push({
        type: 'free',
        start: new Date(currentTime),
        end: new Date(bufferStart),
      })
      currentTime = bufferStart
    }

    if (currentTime < showStart) {
      segments.push({
        type: 'buffer',
        start: new Date(currentTime),
        end: new Date(showStart),
      })
      currentTime = showStart
    }

    if (currentTime < showEnd) {
      segments.push({
        type: 'booked',
        start: new Date(currentTime),
        end: new Date(showEnd),
        show,
      })
      currentTime = showEnd
    }

    if (currentTime < bufferEnd) {
      segments.push({
        type: 'buffer',
        start: new Date(currentTime),
        end: new Date(bufferEnd),
      })
      currentTime = bufferEnd
    }
  }

  if (currentTime < dayEnd) {
    segments.push({
      type: 'free',
      start: new Date(currentTime),
      end: new Date(dayEnd),
    })
  }

  if (proposedShow) {
    segments.push({
      type: 'proposed',
      start: proposedShow.start,
      end: proposedShow.end,
    })
  }

  segments.sort((a, b) => a.start - b.start)

  const legendItem = (label, dotClass) => (
    <div className="flex items-center gap-2">
      <span className={`h-3 w-3 rounded-full ${dotClass}`} />
      <span>{label}</span>
    </div>
  )

  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-4">
      <div className="mb-4 flex flex-wrap gap-4 text-xs font-medium text-slate-600">
        {legendItem('Free', 'bg-sky-400')}
        {legendItem('Buffer', 'bg-amber-400')}
        {legendItem('Booked', 'bg-rose-400')}
        {legendItem('Proposed', 'bg-emerald-400')}
      </div>

      <div className="flex flex-wrap gap-2">
        {segments.map((segment, index) => {
          const duration = (segment.end - segment.start) / (1000 * 60)
          if (duration <= 0) return null

          let blockClass = 'bg-slate-200 text-slate-700 border-slate-200'
          let text = ''

          if (segment.type === 'free') {
            blockClass = 'bg-sky-100 text-sky-900 border-sky-200'
          } else if (segment.type === 'buffer') {
            blockClass = 'bg-amber-100 text-amber-900 border-amber-200'
          } else if (segment.type === 'booked') {
            blockClass = 'bg-rose-100 text-rose-900 border-rose-200'
            text = `${segment.show.movieTitle} (${segment.show.language})`
          } else if (segment.type === 'proposed') {
            blockClass = 'bg-emerald-100 text-emerald-900 border-emerald-200'
            text = 'Planned showtime'
          }

          return (
            <div
              key={index}
              className={`flex min-w-[120px] flex-col justify-center rounded-2xl border px-3 py-2 text-xs shadow-sm transition-transform duration-200 hover:-translate-y-0.5 ${blockClass}`}
              style={{ flex: duration / 60 }}
            >
              <div className="font-semibold">
                {formatScheduledTime(segment.start)} - {formatScheduledTime(segment.end)}
              </div>
              {text ? <div className="mt-1 leading-tight">{text}</div> : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function FilmIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 6h16v12H4z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 6v12" strokeLinecap="round" />
      <path d="M16 6v12" strokeLinecap="round" />
      <path d="M4 10h16" strokeLinecap="round" />
      <path d="M4 14h16" strokeLinecap="round" />
    </svg>
  )
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4l3 2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function GlobeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="8" />
      <path d="M4 12h16" strokeLinecap="round" />
      <path d="M12 4c2.5 2.5 2.5 13.5 0 16" strokeLinecap="round" />
      <path d="M12 4c-2.5 2.5-2.5 13.5 0 16" strokeLinecap="round" />
    </svg>
  )
}

function formatScheduledTime(value) {
  if (!value) return 'TBA'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'TBA'
  return formatTo12Hour(date.toISOString().slice(11, 16))
}
