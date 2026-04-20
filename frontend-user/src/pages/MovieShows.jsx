import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../lib/api'
import { formatDateTimeTo12Hour, formatTo12Hour } from '../lib/time'

const TIME_SLOT_OPTIONS = [
  { value: 'all', label: 'All slots' },
  { value: 'morning', label: 'Morning' },
  { value: 'afternoon', label: 'Afternoon' },
  { value: 'evening', label: 'Evening' },
  { value: 'night', label: 'Night' },
]

function getTimeSlotLabel(dateValue) {
  const date = new Date(dateValue)
  if (Number.isNaN(date.getTime())) return 'night'

  // Match the slot logic to the same UTC wall-clock time displayed in the timing chips.
  const hour = date.getUTCHours()
  if (hour >= 6 && hour < 12) return 'morning'
  if (hour >= 12 && hour < 17) return 'afternoon'
  if (hour >= 17 && hour < 21) return 'evening'
  return 'night'
}

function toggleValue(values, value) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value]
}

function getShowPrice(show) {
  const prices = getShowPrices(show)
  if (!prices.length) return null
  return Math.min(...prices)
}

function getShowPrices(show) {
  const prices = []

  if (Number.isFinite(Number(show?.price))) prices.push(Number(show.price))
  if (Number.isFinite(Number(show?.minPrice))) prices.push(Number(show.minPrice))
  if (Number.isFinite(Number(show?.startingPrice))) prices.push(Number(show.startingPrice))

  if (Array.isArray(show?.ShowSeatPrices)) {
    prices.push(
      ...show.ShowSeatPrices.map((item) => Number(item?.price)).filter((value) => Number.isFinite(value))
    )
  }

  return prices.filter((value) => Number.isFinite(value))
}

export default function MovieShows() {
  const { movieId } = useParams()
  const [shows, setShows] = useState([])
  const [movie, setMovie] = useState(null)
  const [err, setErr] = useState('')
  const [theatreFilter, setTheatreFilter] = useState('all')
  const [minPriceFilter, setMinPriceFilter] = useState('')
  const [maxPriceFilter, setMaxPriceFilter] = useState('')
  const [timeSlotFilter, setTimeSlotFilter] = useState('all')
  const [languageFilter, setLanguageFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0])

  useEffect(() => {
    let alive = true
    api(`/public/movies/${movieId}/shows`)
      .then((d) => {
        if (!alive) return
        const upcomingShows = (d.shows || []).filter((show) => new Date(show.startsAt).getTime() > Date.now())
        setShows(upcomingShows)
        setMovie(d.movie || null)
      })
      .catch((e) => alive && setErr(e.message))

    return () => {
      alive = false
    }
  }, [movieId])

  const theatreOptions = useMemo(
    () =>
      Array.from(
        new Map(
          shows.map((show) => [
            String(show?.Hall?.Theater?.id ?? ''),
            {
              id: String(show?.Hall?.Theater?.id ?? ''),
              name: show?.Hall?.Theater?.name || 'Unknown theatre',
            },
          ])
        ).values()
      )
        .filter((theatre) => theatre.id)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [shows]
  )

  const languageOptions = useMemo(
    () =>
      Array.from(
        new Set(
          shows
            .map((show) => String(show?.language || '').trim())
            .filter(Boolean)
        )
      ).sort((a, b) => a.localeCompare(b)),
    [shows]
  )

  const filteredShows = useMemo(() => {
    return shows.filter((show) => {
      const theatreId = String(show?.Hall?.Theater?.id ?? '')
      const language = String(show?.language || '').trim()
      const slot = getTimeSlotLabel(show?.startsAt)
      const prices = getShowPrices(show)
      const minPrice = minPriceFilter !== '' ? Number(minPriceFilter) : null
      const maxPrice = maxPriceFilter !== '' ? Number(maxPriceFilter) : null
      const showDate = new Date(show.startsAt).toISOString().split('T')[0]

      const theatreMatches = theatreFilter === 'all' || theatreId === theatreFilter
      const priceMatches =
        minPrice === null && maxPrice === null
          ? true
          : prices.some(
              (value) =>
                (minPrice === null || value >= minPrice) &&
                (maxPrice === null || value <= maxPrice)
            )
      const languageMatches = languageFilter === 'all' || language === languageFilter
      const timeSlotMatches = timeSlotFilter === 'all' || slot === timeSlotFilter
      const dateMatches = dateFilter === '' || showDate === dateFilter

      return theatreMatches && priceMatches && languageMatches && timeSlotMatches && dateMatches
    })
  }, [languageFilter, maxPriceFilter, minPriceFilter, shows, theatreFilter, timeSlotFilter, dateFilter])

  const groupedShows = useMemo(() => {
    const grouped = new Map()

    for (const show of filteredShows) {
      const theatreId = String(show?.Hall?.Theater?.id ?? '')
      const movieKey = String(show?.movieId ?? movieId ?? '')
      const key = `${theatreId}:${movieKey}`
      const existing = grouped.get(key) || {
        theatreId,
        movieId: movieKey,
        theatreName: show?.Hall?.Theater?.name || 'Unknown theatre',
        hallNames: new Set(),
        languages: new Set(),
        shows: [],
      }

      existing.hallNames.add(show?.Hall?.name || 'Unknown hall')
      if (show?.language) existing.languages.add(show.language)
      existing.shows.push(show)
      grouped.set(key, existing)
    }

    return Array.from(grouped.values())
      .map((entry) => ({
        ...entry,
        hallName: Array.from(entry.hallNames).join(', '),
        languages: Array.from(entry.languages).sort((a, b) => a.localeCompare(b)),
        shows: entry.shows.sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt)),
      }))
      .sort((a, b) => a.theatreName.localeCompare(b.theatreName))
  }, [filteredShows, movieId])

  return (
    <div className="space-y-8">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition-all duration-300 hover:gap-3 hover:text-slate-950"
      >
        <span className="text-lg">←</span>
        Back to movies
      </Link>

      <section className="page-panel fade-up px-6 py-8 md:px-10 md:py-10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <div className="hero-chip">Choose Showtime</div>
            <h2 className="section-title max-w-2xl">{movie?.title}</h2>
            <p className="section-copy max-w-xl">
              {movie?.description || 'Compare theater, timing, and language details before choosing your seats.'}
            </p>
            {movie?.languages?.length ? (
              <div className="flex flex-wrap gap-2">
                {movie.languages.map((language) => (
                  <span
                    key={language}
                    className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-medium text-slate-600"
                  >
                    {language}
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-sky-100 bg-sky-50/90 px-4 py-4 shadow-sm">
              <div className="text-xs uppercase tracking-[0.18em] text-slate-400">
                Booking
              </div>
              <div className="mt-2 text-sm font-semibold text-slate-900">
                Choose your preferred theater and language.
              </div>
            </div>
            <div className="rounded-2xl border border-violet-100 bg-violet-50/90 px-4 py-4 shadow-sm">
              <div className="text-xs uppercase tracking-[0.18em] text-slate-400">
                Next step
              </div>
              <div className="mt-2 text-sm font-semibold text-slate-900">
                Pick the show that fits your plans
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="space-y-2">
        <h3 className="text-2xl font-semibold tracking-tight text-slate-950 md:text-3xl">
          Available Shows
        </h3>
        <p className="section-copy">Choose a showtime and book your seats</p>
      </div>

      {err && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 shadow-sm">
          {err}
        </div>
      )}

      <section className="soft-card p-5 md:p-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Theatre</div>
            <select
              value={theatreFilter}
              onChange={(e) => setTheatreFilter(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-all duration-200 focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            >
              <option value="all">All theatres</option>
              {theatreOptions.map((theatre) => (
                <option key={theatre.id} value={theatre.id}>
                  {theatre.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Price</div>
            <div className="grid grid-cols-2 gap-2">
              <input
                // type="number"
                min="0"
                step="1"
                value={minPriceFilter}
                onChange={(e) => setMinPriceFilter(e.target.value)}
                placeholder="Min"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-all duration-200 focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              />
              <input
                // type="number"
                min="0"
                step="1"
                value={maxPriceFilter}
                onChange={(e) => setMaxPriceFilter(e.target.value)}
                placeholder="Max"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-all duration-200 focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Time Slot</div>
            <select
              value={timeSlotFilter}
              onChange={(e) => setTimeSlotFilter(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-all duration-200 focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            >
              {TIME_SLOT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

         <div className="space-y-2">
  <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Language</div>
  <select
    value={languageFilter}
    onChange={(e) => setLanguageFilter(e.target.value)}
    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-all duration-200 focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
  >
    <option value="all">All languages</option>
    {languageOptions.map((language) => (
      <option key={language} value={language}>
        {language}
      </option>
    ))}
  </select>
</div>

<div className="space-y-2">
  <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Date</div>
  <input
    type="date"
    value={dateFilter}
    onChange={(e) => setDateFilter(e.target.value)}
    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-all duration-200 focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
  />
</div>
        </div>
      </section>

      {groupedShows.length === 0 ? (
        <div className="soft-card border-dashed p-10 text-center text-slate-500">
          No upcoming shows available
        </div>
      ) : (
        <div className="space-y-4">
          {groupedShows.map((group) => (
            <div key={`${group.theatreId}-${group.movieId}`} className="soft-card overflow-hidden p-5 md:p-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="text-xs uppercase tracking-[0.22em] text-slate-400">
                    Theater
                  </div>
                  <div className="text-lg font-semibold text-slate-950">
                    {group.theatreName}
                  </div>
                
                </div>

                <div className="space-y-2">
                  <div className="text-xs uppercase tracking-[0.22em] text-slate-400">
                    Language
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {group.languages.map((language) => (
                      <span
                        key={language}
                        className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-medium text-slate-600"
                      >
                        {language}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-xs uppercase tracking-[0.22em] text-slate-400">
                    Show timings
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {group.shows.map((show) => (
                      <Link
                        key={show.id}
                        to={`/shows/${show.id}/seats`}
                        className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition-all duration-200 hover:border-slate-900 hover:bg-slate-900 hover:text-white"
                      >
                        {formatTo12Hour(new Date(show.startsAt).toISOString().slice(11, 16))} • {show.language}
                      </Link>
                    ))}
                  </div>
                  <div className="text-sm text-slate-500">
                    {group.shows.length ? `First show: ${formatDateTimeTo12Hour(group.shows[0].startsAt)}` : ''}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
