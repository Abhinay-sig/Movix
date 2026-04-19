
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { z } from 'zod'

function formatCountdown(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export default function OwnerSignup() {
  const [name, setName] = useState('')
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
    setResending(true)

    try {
      const data = await api('/auth/resend-verification', {
        method: 'POST',
        body: { email: verification.email, role: 'theater_owner' },
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
    setFieldErrors({})
    // frontend validation
    const schema = z.object({
      name: z.string().min(1, 'Please enter a name'),
      email: z.string().email('Please enter a valid email'),
      password: z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/\d/, 'Password must include at least one number')
        .regex(/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/, 'Password must include at least one special character'),
    })

    const parsed = schema.safeParse({ name, email, password })
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
      const data = await api('/auth/signup', {
        method: 'POST',
        body: { name, email, password, role: 'theater_owner' },
      })
      setNotice(data.message)
      setVerification(data.verification)
    } catch (e2) {
      setErr(e2.message)
    } finally {
      setLoading(false)
    }
  }

  const fieldClass =
    'w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100'

  return (
    <div className="flex min-h-[calc(100vh-9rem)] items-center justify-center px-4 py-8 bg-transparent">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex flex-col gap-2">
          <h2 className="text-3xl w-fit text-center font-semibold tracking-tight text-slate-900 border-b-2 border-r-2 border-blue-500 rounded-full py-1 px-3">Partner Signup</h2>
          <h2 className="text-xl tracking-tight text-slate-900">
            Create your partner account
          </h2>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
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

          {verification ? (
            <div className="space-y-4 rounded-xl border border-amber-200 bg-amber-50 px-5 py-5 text-sm text-amber-800">
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
                <span>Email signup</span>
                <div className="h-px flex-1 bg-slate-200" />
              </div>

              <input
                placeholder="Multiplex name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={fieldClass}
              />
              {fieldErrors.name ? (
                <div className="text-sm mt-1 text-rose-700">{fieldErrors.name}</div>
              ) : null}

              <input
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={fieldClass}
              />
              {fieldErrors.email ? (
                <div className="text-sm mt-1 text-rose-700">{fieldErrors.email}</div>
              ) : null}

              <div className="relative">
                <input
                  placeholder="Password (min 8 characters)"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`${fieldClass} pr-20`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
                >
                  {showPassword ? <img src="../../public/close_eye.svg" alt="" srcset="" className='w-6 opacity-25' /> : <img src="../../public/open_eye.svg" alt="" srcset="" className='w-6 opacity-25' />}
                </button>
              </div>
              {fieldErrors.password ? (
                <div className="text-sm mt-1 text-rose-700">{fieldErrors.password}</div>
              ) : null}

              <button
                type="submit"
                disabled={loading}
                className="mt-2 inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-blue-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? 'Creating account…' : 'Create partner account'}
              </button>
            </>
          )}
        </form>

        <div className="mt-6 text-center text-sm text-slate-600">
          Already have an account?{' '}
          <Link
            to="/login"
            className="font-medium text-blue-600 transition-colors hover:text-blue-700"
          >
            Back to login
          </Link>
        </div>
      </div>
    </div>
  )
}
