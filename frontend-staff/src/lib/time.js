export function formatTo12Hour(value) {
  if (!value) return ''

  const stringValue = String(value).trim()
  if (!stringValue) return ''

  const timeMatch = stringValue.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/)
  if (timeMatch) {
    const hours = Number(timeMatch[1])
    const minutes = Number(timeMatch[2])
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return stringValue

    const suffix = hours >= 12 ? 'PM' : 'AM'
    const normalizedHours = hours % 12 || 12
    return `${normalizedHours}:${String(minutes).padStart(2, '0')} ${suffix}`
  }

  const date = new Date(stringValue)
  if (Number.isNaN(date.getTime())) return stringValue

  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'UTC',
  })
}

export function formatDateTimeTo12Hour(value, options = {}) {
  if (!value) return 'TBA'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'TBA'

  const timeZone = options.timeZone ?? 'UTC'

  return date.toLocaleString('en-US', {
    weekday: options.weekday ?? 'short',
    day: options.day ?? 'numeric',
    month: options.month ?? 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone,
  })
}
