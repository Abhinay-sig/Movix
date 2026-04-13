import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'

function formatCountdown(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export default function Signup() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [notice, setNotice] = useState('')
  const [verification, setVerification] = useState(null)
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [now, setNow] = useState(Date.now())

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
    window.location.assign('/api/auth/google/start?role=user')
  }

  async function resendVerification() {
    if (!verification?.email) return
    setErr('')
    setResending(true)

    try {
      const data = await api('/auth/resend-verification', {
        method: 'POST',
        body: { email: verification.email, role: 'user' },
      })
      setNotice(data.message)
      setVerification(data.verification)
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
    setLoading(true)
    try {
      const data = await api('/auth/signup', {
        method: 'POST',
        body: { name, email, password, role: 'user' },
      })
      setVerification(data.verification)
      setNotice(data.message)
    } catch (e2) {
      setErr(e2.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-9rem)] items-center justify-center px-4 py-8">
      <div className="page-panel w-full max-w-5xl overflow-hidden">
        <div className="grid lg:grid-cols-[1.02fr_0.98fr]">
          <div className="p-6 md:p-10">
            <div className="mx-auto w-full max-w-md space-y-6">
              <div className="space-y-2">
                <div className="hero-chip">Join Now</div>
                <h2 className="text-3xl font-semibold tracking-tight text-slate-950">
                  Create account
                </h2>
                <p className="section-copy">
                  Create an account to book movies and manage your tickets.
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

              {verification ? (
                <div className="space-y-4 rounded-3xl border border-amber-200 bg-amber-50 px-5 py-5 text-sm text-amber-800">
                  <div>
                    <div className="font-semibold text-amber-950">Check your inbox</div>
                    <div className="mt-1">
                      We sent a verification link to <span className="font-medium">{verification.email}</span>.
                    </div>
                  </div>

                  <div>
                    {remainingSeconds > 0
                      ? `A fresh link can be sent in ${formatCountdown(remainingSeconds)}.`
                      : 'Your countdown is over, so you can resend a new verification link now.'}
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={resendVerification}
                      disabled={remainingSeconds > 0 || resending}
                      className="rounded-full border border-amber-300 px-4 py-2 font-semibold text-amber-900 transition-colors hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {resending ? 'Sending…' : 'Resend verification link'}
                    </button>

                    <button
                      type="button"
                      onClick={() => setVerification(null)}
                      className="rounded-full border border-slate-200 px-4 py-2 font-semibold text-slate-700 transition-colors hover:bg-white"
                    >
                      Use a different email
                    </button>
                  </div>
                </div>
              ) : (
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
                    <span>Email signup</span>
                    <div className="h-px flex-1 bg-slate-200" />
                  </div>

                  <input
                    placeholder="Full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="field-input"
                  />

                  <input
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="field-input"
                  />

                  <input
                    placeholder="Password (min 8)"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="field-input"
                  />

                  <button disabled={loading} className="primary-button w-full">
                    {loading ? 'Creating…' : 'Create account'}
                  </button>
                </form>
              )}

              <div className="text-sm text-slate-500">
                Already have an account?{' '}
                <Link
                  to="/login"
                  className="font-semibold text-slate-950 transition-colors hover:text-blue-600"
                >
                  Login
                </Link>
              </div>
            </div>
          </div>

          <div className="relative hidden overflow-hidden border-l border-white/70 bg-gradient-to-br from-blue-50 via-white to-slate-100 p-10 lg:block">
            <div className="absolute -right-16 top-16 h-56 w-56 rounded-full bg-blue-200/40 blur-3xl" />
            <div className="absolute left-8 bottom-8 h-44 w-44 rounded-full bg-slate-200/70 blur-3xl" />

            <div className="relative space-y-6">
              <div className="rounded-3xl border border-white/80 bg-white/88 p-6 shadow-[0_18px_55px_rgba(15,23,42,0.08)]">
                <div className="text-xs uppercase tracking-[0.22em] text-slate-400">
                  Your booking journey
                </div>
                <div className="mt-4 space-y-4">
                  {[
                    'Create your account',
                    'Choose a movie and showtime',
                    'Reserve seats and confirm payment',
                  ].map((step, index) => (
                    <div key={step} className="flex gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-950 text-sm font-semibold text-white">
                        {index + 1}
                      </div>
                      <div className="pt-2 text-sm font-medium text-slate-700">
                        {step}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-blue-100 bg-blue-50/90 p-6 text-sm leading-7 text-slate-600 shadow-sm">
                Sign up once, then choose a movie, pick your seats, and complete your booking.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
