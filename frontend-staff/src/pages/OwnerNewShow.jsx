import { useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api'
import Modal from '../components/Modal'
import PaginationControls from '../components/PaginationControls'
import { validatePositiveNumberField, withFieldError } from '../lib/formErrors'
import { formatTo12Hour } from '../lib/time'
import Timeline from '../components/Timeline'
import SheduledShows from '../components/SheduledShows'
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

  const panelClass =
    'rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8'

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
          Create showtime
        </h2>
        <p className="text-sm text-slate-500">
          Choose a theater, then one of its halls, and schedule a show without breaking release-date or buffer rules.
        </p>
      </div>

      <div className={`max-w-5xl ${panelClass}`}>
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
                className={withFieldError(fieldClass, Boolean(fieldErrors.theaterId))}
              >
                <option value="">Choose a theater…</option>
                {theaters.filter((t) => !t.isBlocked).map((theater) => (
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
                className={withFieldError(fieldClass, Boolean(fieldErrors.hallId))}
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
              className={withFieldError(fieldClass, Boolean(fieldErrors.movieId))}
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
              className={fieldClass}
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
            disabled={submitting}
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
        <SheduledShows
          theaters={theaters}
          viewDate={viewDate}
          setViewDate={setViewDate}
          viewTheaterId={viewTheaterId}
          setViewTheaterId={setViewTheaterId}
          viewHallId={viewHallId}
          setViewHallId={setViewHallId}
          viewMovieId={viewMovieId}
          setViewMovieId={setViewMovieId}
          viewStatus={viewStatus}
          setViewStatus={setViewStatus}
          viewTimeSlot={viewTimeSlot}
          setViewTimeSlot={setViewTimeSlot}
          viewFilteredHalls={viewFilteredHalls}
          movies={movies}
          loadingOwnerShows={loadingOwnerShows}
          sortedShows={sortedShows}
          setShowToDelete={setShowToDelete}
          showsPagination={showsPagination}
          setShowsPage={setShowsPage}
          clearShowFilters={clearShowFilters}
          fieldClass={fieldClass}
          formatScheduledTime={formatScheduledTime}
        />
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



function formatScheduledTime(value) {
  if (!value) return 'TBA'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'TBA'
  return formatTo12Hour(date.toISOString().slice(11, 16))
}
