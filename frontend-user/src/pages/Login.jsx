import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
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
  const loc = useLocation()
  const [params] = useSearchParams()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [err, setErr] = useState('')
  const [notice, setNotice] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [verification, setVerification] = useState(null)
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
    setFieldErrors({})
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
      return
    }

    setLoading(true)
    try {
      const data = await api('/auth/login', { method: 'POST', body: { email, password } })
      if (data.user?.role !== 'user') throw new Error('This account is managed in the staff app.')
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
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <div className="space-y-2">
          <h2 className="text-3xl w-fit text-center font-semibold tracking-tight text-slate-900 border-b-2 border-r-2 border-blue-500 rounded-full py-1 px-3">Welcome Back</h2>
          {/* <h2 className="text-3xl font-semibold tracking-tight text-slate-900">Welcome back</h2> */}
          <p className="section-copy">
            Sign in to continue browsing shows and managing your bookings.
          </p>
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
            <span>Email login</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <input
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="field-input"
          />
          {fieldErrors.email ? (
            <div className="text-sm mt-1 text-rose-700">{fieldErrors.email}</div>
          ) : null}

          <div className="relative">
            <input
              placeholder="Password"
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
          {fieldErrors.password ? (
            <div className="text-sm mt-1 text-rose-700">{fieldErrors.password}</div>
          ) : null}

          <div className="flex justify-end">
            <Link
              to={resetHref}
              className="text-sm font-medium text-slate-500 transition-colors hover:text-blue-600"
            >
              Forgot password?
            </Link>
          </div>

          <button type="submit" disabled={loading} className="primary-button w-full">
            {loading ? 'Logging in…' : 'Login'}
          </button>
        </form>

        {verification ? (
          <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-800">
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

        <div className="mt-6 text-sm text-slate-500">
          New user?{' '}
          <Link
            to="/signup"
            className="font-semibold text-slate-900 transition-colors hover:text-blue-600"
          >
            Create account
          </Link>
        </div>
      </div>
    </div>
  )
}
