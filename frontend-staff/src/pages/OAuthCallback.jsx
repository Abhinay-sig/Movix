import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../useAuth'

export default function OAuthCallback() {
  const nav = useNavigate()
  const { setAuth } = useAuth()
  const [err, setErr] = useState('')

  useEffect(() => {
    try {
      const hash = window.location.hash.startsWith('#')
        ? window.location.hash.slice(1)
        : window.location.hash
      const params = new URLSearchParams(hash)
      const token = params.get('token')
      const rawUser = params.get('user')

      if (!token || !rawUser) {
        throw new Error('Missing OAuth login details')
      }

      setAuth({ token, user: JSON.parse(rawUser) })
      nav('/', { replace: true })
    } catch (e) {
      setErr(e.message)
    }
  }, [nav, setAuth])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4">
      <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="space-y-3">
          <div className="staff-chip mx-auto inline-flex">OAuth2</div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            {err ? 'Google sign-in could not be completed' : 'Signing you in'}
          </h1>
          <p className="text-sm leading-7 text-slate-500">
            {err || 'We are finishing your Google authentication and redirecting you now.'}
          </p>
        </div>
      </div>
    </div>
  )
}
