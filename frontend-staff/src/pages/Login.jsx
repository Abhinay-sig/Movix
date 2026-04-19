import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../useAuth'
import { z } from 'zod'

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
  const [showPassword, setShowPassword] = useState(false)
  const [err, setErr] = useState('')
  const [notice, setNotice] = useState('')
  const [verification, setVerification] = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [now, setNow] = useState(Date.now())
  const resetHref = email ? `/reset-password?email=${encodeURIComponent(email)}` : '/reset-password'

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
    setFieldErrors({})
    setLoading(true)
    // frontend validation
    const schema = z.object({
      email: z.string().email('Please enter a valid email'),
      password: z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/\d/, 'Password must include at least one number')
        .regex(/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/, 'Password must include at least one special character'),
    })

    const parsed = schema.safeParse({ email, password })
    if (!parsed.success) {
      const errs = {}
      parsed.error.issues.forEach((e) => {
        const key = e.path && e.path.length ? e.path[0] : '_form'
        errs[key] = e.message
      })
      setFieldErrors(errs)
      setErr(Object.values(errs).join(' '))
      setLoading(false)
      return
    }
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
    `flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-300 ${
      active
        ? 'bg-blue-600 text-white shadow-sm'
        : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900'
    }`

  return (
    <div className="flex max-h-[calc(100vh-9rem)] items-center justify-center px-4 py-8 text-slate-900">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <div className="mb-6 space-y-2">
          <h2 className="text-3xl w-fit text-center font-semibold tracking-tight text-slate-900 border-b-2 border-r-2 border-blue-500 rounded-full py-1 px-3">{mode === 'owner' ? 'Multiplex' : 'Admin'} login</h2>
        </div>
        <div className="mb-6 flex rounded-xl border border-slate-200 bg-slate-100 p-1">
          <button
            onClick={() => setMode('owner')}
            disabled={mode === 'owner'}
            className={tabClass(mode === 'owner')}
            type="button"
          >
            Multiplex
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
                className="flex w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
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
            {fieldErrors.email ? (
              <div className="text-sm mt-1 text-rose-700">{fieldErrors.email}</div>
            ) : null}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Password</label>
            <div className="relative">
              <input
                placeholder="Enter your password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="staff-input pr-20"
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
            {fieldErrors.password ? (
              <div className="text-sm mt-1 text-rose-700">{fieldErrors.password}</div>
            ) : null}
          </div>
          {mode === 'owner' ? (
            <div className="flex justify-end">
              <Link
                to={resetHref}
                className="text-sm font-medium text-slate-500 transition-colors hover:text-blue-600"
              >
                Forgot password?
              </Link>
            </div>
          ) : null}

          <button type="submit" disabled={loading} className="staff-primary w-full">
            {loading ? 'Logging in…' : 'Login'}
          </button>

          {err ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {err}
            </div>
          ) : null}

          {notice ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {notice}
            </div>
          ) : null}
        </form>

        {verification && mode === 'owner' ? (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-800">
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
      </div>
    </div>
  )
}
