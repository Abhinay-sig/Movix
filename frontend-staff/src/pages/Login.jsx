import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../AuthContext'

export default function Login() {
  const { setAuth } = useAuth()
  const nav = useNavigate()
  const [mode, setMode] = useState('owner')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  async function onSubmit(e) {
    e.preventDefault()
    setErr('')
    setLoading(true)

    try {
      const path = mode === 'admin' ? '/auth/admin/login' : '/auth/login'
      const data = await api(path, { method: 'POST', body: { email, password } })

      if (mode === 'admin' && data.user?.role !== 'admin') {
        throw new Error('Not an admin user')
      }

      if (mode === 'owner' && data.user?.role !== 'theater_owner') {
        throw new Error('This account belongs in the guest booking experience.')
      }

      setAuth(data)
      nav('/', { replace: true })
    } catch (e2) {
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
                  Switch between owner and admin access, then manage operations in
                  a lighter, more organized workspace.
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
                  Sign in to manage your cinema business or the Movix platform experience.
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
              </form>

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
