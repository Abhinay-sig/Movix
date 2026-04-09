import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../useAuth'

function formatCountdown(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export default function Login() {
  const { setAuth } = useAuth()
  const nav = useNavigate()
  const loc = useLocation()
  const [params] = useSearchParams()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [notice, setNotice] = useState('')
  const [verification, setVerification] = useState(null)
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const oauthError = params.get('oauthError')
    if (oauthError) setErr(oauthError)
  }, [params])

  useEffect(() => {
    if (!verification?.nextResendAt) return undefined

    const timer = window.setInterval(() => {
      setNow(Date.now())
    }, 1000)

    return () => window.clearInterval(timer)
  }, [verification?.nextResendAt])

  const remainingSeconds = verification?.nextResendAt
    ? Math.max(0, Math.ceil((new Date(verification.nextResendAt).getTime() - now) / 1000))
    : 0

  async function resendVerification() {
    if (!verification?.email) return
    setErr('')
    setNotice('')
    setResending(true)

    try {
      const data = await api('/auth/resend-verification', {
        method: 'POST',
        body: { email: verification.email, role: 'user' },
      })
      setVerification(data.verification)
      setNotice(data.message)
    } catch (e2) {
      if (e2.details?.verification) {
        setVerification(e2.details.verification)
      }
      setErr(e2.message)
    } finally {
      setResending(false)
    }
  }

  function startGoogleAuth() {
    window.location.assign('/api/auth/google/start?role=user')
  }

  async function onSubmit(e) {
    e.preventDefault()
    setErr('')
    setNotice('')
    setVerification(null)
    setLoading(true)
    try {
      const data = await api('/auth/login', { method: 'POST', body: { email, password } })
      if (data.user?.role !== 'user') throw new Error('This account is managed through our partner workspace.')
      setAuth(data)
      nav(loc.state?.from || '/', { replace: true })
    } catch (e2) {
      if (e2.details?.verification) {
        setVerification(e2.details.verification)
      }
      setErr(e2.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-9rem)] items-center justify-center px-4 py-8">
      <div className="page-panel w-full max-w-5xl overflow-hidden">
        <div className="grid lg:grid-cols-[0.95fr_1.05fr]">
          <div className="relative hidden overflow-hidden border-r border-white/70 bg-gradient-to-br from-slate-950 via-slate-900 to-blue-600 p-10 text-white lg:block">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.18),transparent_35%)]" />
            <div className="absolute -left-16 top-20 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute bottom-8 right-4 h-40 w-40 rounded-full bg-blue-200/20 blur-3xl" />

            <div className="relative space-y-6">
              <div className="hero-chip border-white/15 bg-white/10 text-blue-50">
                Member Access
              </div>
              <div className="space-y-3">
                <h2 className="text-4xl font-semibold tracking-tight">
                  Welcome back to your next movie night.
                </h2>
                <p className="max-w-md text-sm leading-7 text-blue-50/82">
                  Sign in to continue your booking, revisit seat selection, and
                  enjoy a calmer cinema checkout experience.
                </p>
              </div>

              <div className="grid gap-3">
                {['Clean browsing', 'Seat hold protection', 'Fast confirmation'].map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-white/12 bg-white/10 px-4 py-3 backdrop-blur-sm"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="p-6 md:p-10">
            <div className="mx-auto w-full max-w-md space-y-6">
              <div className="space-y-2">
                <div className="hero-chip">Login</div>
                <h2 className="text-3xl font-semibold tracking-tight text-slate-950">
                  Welcome back
                </h2>
                <p className="section-copy">
                  Sign in to continue browsing shows and managing your bookings.
                </p>
              </div>

              {err && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                  {err}
                </div>
              )}

              {notice && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {notice}
                </div>
              )}

              <form onSubmit={onSubmit} className="space-y-4">
                <button
                  type="button"
                  onClick={startGoogleAuth}
                  className="flex w-full items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:border-blue-200 hover:text-blue-700"
                >
                  Continue with Google
                </button>

                <div className="flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-slate-400">
                  <div className="h-px flex-1 bg-slate-200" />
                  <span>Email login</span>
                  <div className="h-px flex-1 bg-slate-200" />
                </div>

                <input
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="field-input"
                />

                <input
                  placeholder="Password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="field-input"
                />

                <button disabled={loading} className="primary-button w-full">
                  {loading ? 'Logging in…' : 'Login'}
                </button>
              </form>

              {verification ? (
                <div className="rounded-3xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-800">
                  <div className="font-semibold text-amber-900">Email verification pending</div>
                  <div className="mt-1">
                    We already sent a verification link to <span className="font-medium">{verification.email}</span>.
                  </div>
                  <div className="mt-3">
                    {remainingSeconds > 0
                      ? `Resend available in ${formatCountdown(remainingSeconds)}`
                      : 'You can request a fresh verification link now.'}
                  </div>
                  <button
                    type="button"
                    onClick={resendVerification}
                    disabled={remainingSeconds > 0 || resending}
                    className="mt-4 rounded-full border border-amber-300 px-4 py-2 font-semibold text-amber-900 transition-colors hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {resending ? 'Sending…' : 'Resend verification'}
                  </button>
                </div>
              ) : null}

              <div className="text-sm text-slate-500">
                New user?{' '}
                <Link
                  to="/signup"
                  className="font-semibold text-slate-950 transition-colors hover:text-blue-600"
                >
                  Create account
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
