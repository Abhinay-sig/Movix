import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../AuthContext'

export default function Login() {
  const { setAuth } = useAuth()
  const nav = useNavigate()
  const [mode, setMode] = useState('owner') // owner | admin
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
      if (mode === 'admin' && data.user?.role !== 'admin') throw new Error('Not an admin user')
      if (mode === 'owner' && data.user?.role !== 'theater_owner') {
        throw new Error('Please login in user portal')
      }
      setAuth(data)
      nav('/', { replace: true })
    } catch (e2) {
      setErr(e2.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-xl p-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-6">Staff login</h2>
        <div className="flex gap-3 mb-6">
          <button 
            onClick={() => setMode('owner')} 
            disabled={mode === 'owner'} 
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${mode === 'owner' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            Theater owner
          </button>
          <button 
            onClick={() => setMode('admin')} 
            disabled={mode === 'admin'} 
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${mode === 'admin' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            Admin
          </button>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <input
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-50">{loading ? 'Logging in…' : 'Login'}</button>
          {err ? <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">{err}</div> : null}
        </form>
        <div className="mt-6 text-sm text-gray-600">
          Theater owner signup? <Link to="/owner/signup" className="text-blue-600 hover:text-blue-700 font-medium">Create owner account</Link>
        </div>
        <div className="mt-4 text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
          Admin has no signup. Use `ADMIN_EMAIL` / `ADMIN_PASSWORD` from backend env.
        </div>
      </div>
    </div>
  )
}

