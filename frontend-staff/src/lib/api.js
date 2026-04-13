export async function api(path, { method = 'GET', body, token } = {}) {
  const headers = { 'content-type': 'application/json' }
  if (token) headers.authorization = `Bearer ${token}`
  const res = await fetch(`/api${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const text = await res.text()
  const data = text ? JSON.parse(text) : null
  if (!res.ok) {
    if (res.status === 401) {
      // Session is invalid/expired on backend. Reset local auth and force fresh login.
      localStorage.removeItem('mvp_staff_auth')
      localStorage.removeItem('token')
      if (window.location.pathname !== '/login') {
        window.location.replace('/login')
      }
    }
    const msg = data?.error?.message || `Request failed (${res.status})`
    const err = new Error(msg)
    err.status = res.status
    err.details = data?.error?.details
    throw err
  }
  return data
}
