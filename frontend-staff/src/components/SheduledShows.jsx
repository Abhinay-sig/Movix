import React from 'react'
import PaginationControls from './PaginationControls'
import { Film, Clock, Globe } from 'lucide-react'

export default function SheduledShows({
  theaters,
  viewDate,
  setViewDate,
  viewTheaterId,
  setViewTheaterId,
  viewHallId,
  setViewHallId,
  viewMovieId,
  setViewMovieId,
  viewStatus,
  setViewStatus,
  viewTimeSlot,
  setViewTimeSlot,
  viewFilteredHalls,
  movies,
  loadingOwnerShows,
  sortedShows,
  setShowToDelete,
  showsPagination,
  setShowsPage,
  clearShowFilters,
  fieldClass,
  formatScheduledTime,
}) {
  return (
    <>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <h3 className="text-xl font-semibold text-slate-900">Scheduled shows</h3>
          <p className="text-sm text-slate-500">Review the day plan by theater, hall, or movie.</p>
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
            <div className="text-sm text-slate-500">Narrow the schedule by date, theater, hall, or movie.</div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">Date</label>
            <input type="date" value={viewDate} onChange={(e) => setViewDate(e.target.value)} className={fieldClass} />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">Theater</label>
            <select
              value={viewTheaterId}
              onChange={(e) => {
                setViewTheaterId(e.target.value)
                setViewHallId('')
              }}
              className={fieldClass}
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
            <select value={viewHallId} onChange={(e) => setViewHallId(e.target.value)} disabled={!viewTheaterId} className={fieldClass}>
              <option value="">{!viewTheaterId ? 'Select theater first' : 'All halls'}</option>
              {viewFilteredHalls.map((hall) => (
                <option key={hall.id} value={hall.id}>
                  #{hall.id} {hall.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">Movie</label>
            <select value={viewMovieId} onChange={(e) => setViewMovieId(e.target.value)} className={fieldClass}>
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
            <select value={viewStatus} onChange={(e) => setViewStatus(e.target.value)} className={fieldClass}>
              <option value="all">All statuses</option>
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">Time Slot</label>
            <select value={viewTimeSlot} onChange={(e) => setViewTimeSlot(e.target.value)} className={fieldClass}>
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
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">Loading scheduled shows…</div>
        ) : sortedShows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">No shows scheduled. Try selecting another date.</div>
        ) : (
          <div className="grid gap-4">
            {sortedShows.map((show) => (
              <article key={show.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md sm:p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                      <Film className="h-4 w-4" />
                      Movie Name
                    </div>
                    <div className="text-lg font-semibold text-slate-950">{show.movieTitle}</div>
                    <div className="text-sm text-slate-500">Theatre Name: {show.theaterName}</div>
                    <div className="text-sm text-slate-500">Hall Name: {show.hallName}</div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
                      <Clock className="h-4 w-4" />
                      Show Time: {formatScheduledTime(show.startsAt)} - {formatScheduledTime(show.endsAt)}
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                      <Globe className="h-4 w-4" />
                      Language: {show.language}
                    </span>
                    <button type="button" onClick={() => setShowToDelete(show)} className="rounded-lg bg-red-50 px-3 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-100">Delete</button>
                  </div>
                </div>
              </article>
            ))}

            {!viewDate ? (
              <PaginationControls pagination={showsPagination} onPageChange={(nextPage) => setShowsPage(nextPage)} />
            ) : null}
          </div>
        )}
      </div>
    </>
  )
}
