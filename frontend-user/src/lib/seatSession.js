const KEY = 'movix_seat_session'
const PENDING_RELEASE_KEY = 'movix_pending_seat_release'

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

export function resetSeatSessionToken() {
  const created = createSessionToken()

  try {
    sessionStorage.setItem(KEY, created)
  } catch {
    return created
  }

  return created
}

export function savePendingSeatRelease(payload) {
  try {
    sessionStorage.setItem(PENDING_RELEASE_KEY, JSON.stringify(payload))
  } catch {
    // ignore storage errors and let direct release attempt handle it
  }
}

export function getPendingSeatRelease() {
  try {
    const raw = sessionStorage.getItem(PENDING_RELEASE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function clearPendingSeatRelease() {
  try {
    sessionStorage.removeItem(PENDING_RELEASE_KEY)
  } catch {
    // ignore storage errors
  }
}
