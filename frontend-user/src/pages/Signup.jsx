import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../useAuth'

export default function Signup() {
  const { setAuth } = useAuth()
  const nav = useNavigate()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  async function onSubmit(e) {
    e.preventDefault()
    setErr('')
    setLoading(true)
    try {
      const data = await api('/auth/signup', {
        method: 'POST',
        body: { name, email, password, role: 'user' },
      })
      setAuth(data)
      nav('/', { replace: true })
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
                  Get started with a smoother movie booking experience.
                </p>
              </div>

              {err && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                  {err}
                </div>
              )}

              <form onSubmit={onSubmit} className="space-y-4">
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
                Light colors, cleaner spacing, and calmer motion make the booking
                flow easier to navigate from the first screen onward.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
