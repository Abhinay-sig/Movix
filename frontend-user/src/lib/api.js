<<<<<<< HEAD
function resolveStoredToken() {
  try {
    const userRaw = localStorage.getItem('mvp_user_auth')
    if (userRaw) {
      const userAuth = JSON.parse(userRaw)
      if (userAuth?.token) return userAuth.token
    }
  } catch {
    // ignore localStorage/parse errors
  }

  try {
    const staffRaw = localStorage.getItem('mvp_staff_auth')
    if (staffRaw) {
      const staffAuth = JSON.parse(staffRaw)
      if (staffAuth?.token) return staffAuth.token
    }
  } catch {
    // ignore localStorage/parse errors
  }

  return null
}

export async function api(path, { method = 'GET', body, token } = {}) {
  const headers = { 'content-type': 'application/json' }
  const bearer = token || resolveStoredToken()
  if (bearer) headers.authorization = `Bearer ${bearer}`
=======
export async function api(path, { method = 'GET', body, token, keepalive, headers: extraHeaders } = {}) {
  const headers = { 'content-type': 'application/json', ...(extraHeaders || {}) }
  if (token) headers.authorization = `Bearer ${token}`
>>>>>>> origin/main
  const res = await fetch(`/api${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    keepalive,
  })
  const text = await res.text()
  const data = text ? JSON.parse(text) : null
  if (!res.ok) {
    const msg = data?.error?.message || `Request failed (${res.status})`
    const err = new Error(msg)
    err.status = res.status
    err.details = data?.error?.details
    throw err
  }
  return data
}
