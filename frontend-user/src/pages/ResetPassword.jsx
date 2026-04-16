import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../lib/api'

export default function ResetPassword() {
  const nav = useNavigate()
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const initialEmail = params.get('email') ?? ''
  const isTokenMode = Boolean(token)

  const [email, setEmail] = useState(initialEmail)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [notice, setNotice] = useState('')

  const subtitle = useMemo(
    () =>
      isTokenMode
        ? 'Choose a new password for your account. After saving it, you can sign in with both Google and password if this account was created with OAuth.'
        : 'Enter the email address tied to your Movix account and we will send you a password reset link.',
    [isTokenMode]
  )

  async function onSubmit(e) {
    e.preventDefault()
    setErr('')
    setNotice('')

    if (isTokenMode) {
      if (password.length < 8) {
        setErr('Password must be at least 8 characters long')
        return
      }

      if (password !== confirmPassword) {
        setErr('Passwords do not match')
        return
      }
    }

    setLoading(true)

    try {
      const data = isTokenMode
        ? await api('/auth/reset-password', {
            method: 'POST',
            body: { token, password, role: 'user' },
          })
        : await api('/auth/forgot-password', {
            method: 'POST',
            body: { email, role: 'user' },
          })

      setNotice(data.message)

      if (isTokenMode) {
        window.setTimeout(() => {
          nav('/login', { replace: true })
        }, 1200)
      } else {
        setEmail('')
      }
    } catch (e2) {
      setErr(e2.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-9rem)] items-center justify-center px-4 py-8">
      <div className="page-panel w-full max-w-xl p-8 md:p-10">
        <div className="space-y-6">
          <div className="space-y-2 text-center">
            <div className="hero-chip mx-auto">{isTokenMode ? 'Set Password' : 'Forgot Password'}</div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
              {isTokenMode ? 'Create your new password' : 'Reset your password'}
            </h1>
            <p className="section-copy">{subtitle}</p>
          </div>

          {err ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {err}
            </div>
          ) : null}

          {notice ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {notice}
            </div>
          ) : null}

          <form onSubmit={onSubmit} className="space-y-4">
            {isTokenMode ? (
              <>
                <div className="relative">
                  <input
                    placeholder="New password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="field-input pr-12"
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
                <div className="relative">
                  <input
                    placeholder="Confirm new password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="field-input pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((value) => !value)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 transition-colors hover:bg-slate-100"
                  >
                    {showConfirmPassword ? (
                      <img src="/close_eye.svg" alt="Hide password" className="w-6 opacity-25" />
                    ) : (
                      <img src="/open_eye.svg" alt="Show password" className="w-6 opacity-25" />
                    )}
                  </button>
                </div>
              </>
            ) : (
              <input
                placeholder="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="field-input"
              />
            )}

            <button disabled={loading} className="primary-button w-full">
              {loading
                ? isTokenMode
                  ? 'Saving password…'
                  : 'Sending reset link…'
                : isTokenMode
                  ? 'Save password'
                  : 'Send reset link'}
            </button>
          </form>

          <div className="text-center text-sm text-slate-500">
            <Link
              to="/login"
              className="font-semibold text-slate-950 transition-colors hover:text-blue-600"
            >
              Back to login
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
