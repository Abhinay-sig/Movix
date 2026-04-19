function resolveStoredToken() {
  try {
    const userRaw = localStorage.getItem('user_auth')
    if (userRaw) {
      const userAuth = JSON.parse(userRaw)
      if (userAuth?.token) return userAuth.token
    }
  } catch {
    // ignore localStorage/parse errors
  }

  try {
    const staffRaw = localStorage.getItem('staff_auth')
    if (staffRaw) {
      const staffAuth = JSON.parse(staffRaw)
      if (staffAuth?.token) return staffAuth.token
    }
  } catch {
    // ignore localStorage/parse errors
  }

  return null
}

function resolveApiBase() {
  const configuredBase = import.meta.env.VITE_API_BASE_URL
  if (configuredBase) return configuredBase.replace(/\/$/, '')
  if (import.meta.env.DEV) return 'http://localhost:3001/api'
  return '/api'
}

async function parseResponse(res) {
  const contentType = res.headers.get('content-type') || ''
  const text = await res.text()

  if (!text) return null

  if (contentType.includes('application/json')) {
    try {
      return JSON.parse(text)
    } catch {
      const err = new Error('Server returned invalid JSON')
      err.status = res.status
      err.raw = text
      throw err
    }
  }

  if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
    const err = new Error('API request returned HTML instead of JSON. Check that the backend server is running on port 3001.')
    err.status = res.status
    err.raw = text
    throw err
  }

  return text
}

export async function api(path, { method = 'GET', body, token, keepalive, headers: extraHeaders } = {}) {
  const headers = { 'content-type': 'application/json', ...(extraHeaders || {}) }
  const bearer = token || resolveStoredToken()
  if (bearer && !headers.authorization) headers.authorization = `Bearer ${bearer}`
  const res = await fetch(`${resolveApiBase()}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    keepalive,
  })
  const data = await parseResponse(res)
  if (!res.ok) {
    const msg =
      (typeof data === 'object' && data?.error?.message) ||
      (typeof data === 'string' && data) ||
      `Request failed (${res.status})`
    const err = new Error(msg)
    err.status = res.status
    err.details = typeof data === 'object' ? data?.error?.details : undefined
    throw err
  }
  return data
}
