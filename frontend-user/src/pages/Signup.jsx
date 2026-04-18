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
  const [showPassword, setShowPassword] = useState(false)
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
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <div className="space-y-2">
          <h2 className="text-3xl w-fit text-center font-semibold tracking-tight text-slate-900 border-b-2 border-r-2 border-blue-500 rounded-full py-1 px-3">Create Account</h2>
          <p className="section-copy">Get started with a smoother movie booking experience.</p>
        </div>

        {err && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {err}
          </div>
        )}

        {notice && (
          <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {notice}
          </div>
        )}

        {verification ? (
          <div className="mt-6 space-y-4 rounded-xl border border-amber-200 bg-amber-50 px-5 py-5 text-sm text-amber-800">
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
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <button
              type="button"
              onClick={startGoogleAuth}
              className="flex w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
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

            <div className="relative">
              <input
                placeholder="Password (min 8)"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="field-input pr-20"
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 transition-colors hover:bg-slate-100"
              >
                {showPassword ? (
                  <img src="/close_eye.svg" alt="Hide password" className="w-6 opacity-25" />
                ) : (
                  <img src="/open_eye.svg" alt="Show password" className="w-6 opacity-25" />
                )}
              </button>
            </div>

            <button disabled={loading} className="primary-button w-full">
              {loading ? 'Creating…' : 'Create account'}
            </button>
          </form>
        )}

        <div className="mt-6 text-sm text-slate-500">
          Already have an account?{' '}
          <Link
            to="/login"
            className="font-semibold text-slate-900 transition-colors hover:text-blue-600"
          >
            Login
          </Link>
        </div>
      </div>
    </div>
  )
}
