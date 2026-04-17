import React from 'react'
import { formatTo12Hour } from '../lib/time'

function toWallClockUtc(date, time) {
  return new Date(`${date}T${time}:00.000Z`)
}

function formatScheduledTime(value) {
  if (!value) return 'TBA'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'TBA'
  return formatTo12Hour(date.toISOString().slice(11, 16))
}

export default function Timeline({ schedule, proposedStart, proposedDuration, date }) {
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
