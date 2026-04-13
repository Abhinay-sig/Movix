const KEY = 'movix_seat_session'

function createSessionToken() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  return `seat-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`
}

export function getSeatSessionToken() {
  try {
    const existing = sessionStorage.getItem(KEY)
    if (existing) return existing

    const created = createSessionToken()
    sessionStorage.setItem(KEY, created)
    return created
  } catch {
    return createSessionToken()
  }
}
