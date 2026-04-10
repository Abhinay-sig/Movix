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
    <div className="flex min-h-[calc(100vh-9rem)] items-center justify-center px-4 py-8">
      <div className="page-panel w-full max-w-lg p-8 text-center">
        <div className="space-y-3">
          <div className="hero-chip mx-auto">OAuth2</div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
            {err ? 'Google sign-in could not be completed' : 'Signing you in'}
          </h1>
          <p className="section-copy">
            {err || 'We are finishing your Google authentication and redirecting you now.'}
          </p>
        </div>
      </div>
    </div>
  )
}
