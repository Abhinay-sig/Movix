import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
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
  const [params] = useSearchParams()
  const [mode, setMode] = useState('owner')
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

  function startGoogleAuth() {
    window.location.assign('/api/auth/google/start?role=theater_owner')
  }

  async function resendVerification() {
    if (!verification?.email) return
    setErr('')
    setNotice('')
    setResending(true)

    try {
      const data = await api('/auth/resend-verification', {
        method: 'POST',
        body: { email: verification.email, role: 'theater_owner' },
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

  async function onSubmit(e) {
    e.preventDefault()
    setErr('')
    setNotice('')
    setVerification(null)
    setLoading(true)

    try {
      const path = mode === 'admin' ? '/auth/admin/login' : '/auth/login'
      const data = await api(path, { method: 'POST', body: { email, password } })

      if (mode === 'admin' && data.user?.role !== 'admin') {
        throw new Error('Not an admin user')
      }

      if (mode === 'owner' && data.user?.role !== 'theater_owner') {
        throw new Error('This account belongs in the customer app.')
      }

      setAuth(data)
      nav('/', { replace: true })
    } catch (e2) {
      if (e2.details?.verification) {
        setVerification(e2.details.verification)
      }
      setErr(e2.message)
    } finally {
      setLoading(false)
    }
  }

  const tabClass = (active) =>
    `flex-1 rounded-full px-4 py-2.5 text-sm font-medium transition-all duration-300 ${
      active
        ? 'bg-slate-950 text-white shadow-sm'
        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-950'
    }`

  return (
    <div className="flex min-h-[calc(100vh-9rem)] items-center justify-center px-4 py-8 text-slate-900">
      <div className="staff-panel w-full max-w-5xl overflow-hidden">
        <div className="grid lg:grid-cols-[0.94fr_1.06fr]">
          <div className="relative hidden overflow-hidden border-r border-white/70 bg-gradient-to-br from-slate-950 via-slate-900 to-blue-600 p-10 text-white lg:block">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.18),transparent_35%)]" />
            <div className="absolute -left-12 top-14 h-44 w-44 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute right-6 bottom-8 h-40 w-40 rounded-full bg-blue-200/20 blur-3xl" />

            <div className="relative space-y-6">
              <div className="staff-chip border-white/15 bg-white/10 text-blue-50">
                Secure Access
              </div>
              <div className="space-y-3">
                <h2 className="text-4xl font-semibold tracking-tight">
                  Staff tools built for theater owners and admins.
                </h2>
                <p className="max-w-md text-sm leading-7 text-blue-50/82">
                  Switch between owner and admin access to manage theaters, shows, and approvals.
                </p>
              </div>

              <div className="grid gap-3">
                {['Review approvals', 'Manage schedules', 'Track revenue'].map((item) => (
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

          <div className="p-6 sm:p-8 md:p-10">
            <div className="mx-auto w-full max-w-md">
              <div className="mb-8 space-y-2">
                <div className="staff-chip">Staff Login</div>
                <h2 className="text-3xl font-semibold tracking-tight text-slate-900">
                  Staff login
                </h2>
                <p className="text-sm text-slate-500">
                  Sign in to manage your cinema business or platform operations.
                </p>
              </div>

              <div className="mb-6 flex rounded-full bg-slate-100 p-1">
                <button
                  onClick={() => setMode('owner')}
                  disabled={mode === 'owner'}
                  className={tabClass(mode === 'owner')}
                  type="button"
                >
                  Theater owner
                </button>
                <button
                  onClick={() => setMode('admin')}
                  disabled={mode === 'admin'}
                  className={tabClass(mode === 'admin')}
                  type="button"
                >
                  Admin
                </button>
              </div>

              <form onSubmit={onSubmit} className="space-y-4">
                {mode === 'owner' ? (
                  <>
                    <button
                      type="button"
                      onClick={startGoogleAuth}
                      className="flex w-full items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:border-blue-200 hover:text-blue-700"
                    >
                      Continue with Google
                    </button>

                    <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.22em] text-slate-400">
                      <div className="h-px flex-1 bg-slate-200" />
                      <span>Email login</span>
                      <div className="h-px flex-1 bg-slate-200" />
                    </div>
                  </>
                ) : null}

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Email</label>
                  <input
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="staff-input"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Password</label>
                  <input
                    placeholder="Enter your password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="staff-input"
                  />
                </div>

                <button disabled={loading} className="staff-primary w-full">
                  {loading ? 'Logging in…' : 'Login'}
                </button>

                {err ? (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {err}
                  </div>
                ) : null}

                {notice ? (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    {notice}
                  </div>
                ) : null}
              </form>

              {verification && mode === 'owner' ? (
                <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-800">
                  <div className="font-semibold text-amber-950">Partner email verification pending</div>
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

              <div className="mt-6 text-sm text-slate-600">
                New cinema partner?{' '}
                <Link
                  to="/owner/signup"
                  className="font-medium text-blue-600 transition-colors hover:text-blue-700"
                >
                  Create your account
                </Link>
              </div>

              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-500">
                Platform access for the Movix team is managed separately.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
