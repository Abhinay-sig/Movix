// import { useState } from 'react'
// import { Link, useNavigate } from 'react-router-dom'
// import { api } from '../lib/api'
// import { useAuth } from '../AuthContext'

// export default function OwnerSignup() {
//   const { setAuth } = useAuth()
//   const nav = useNavigate()
//   const [name, setName] = useState('')
//   const [email, setEmail] = useState('')
//   const [password, setPassword] = useState('')
//   const [err, setErr] = useState('')
//   const [loading, setLoading] = useState(false)

//   async function onSubmit(e) {
//     e.preventDefault()
//     setErr('')
//     setLoading(true)
//     try {
//       const data = await api('/auth/signup', {
//         method: 'POST',
//         body: { name, email, password, role: 'theater_owner' },
//       })
//       setAuth(data)
//       nav('/', { replace: true })
//     } catch (e2) {
//       setErr(e2.message)
//     } finally {
//       setLoading(false)
//     }
//   }

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center px-4">
//       <div className="w-full max-w-md bg-white rounded-xl shadow-xl p-8">
//         <h2 className="text-3xl font-bold text-gray-900 mb-6">Theater owner signup</h2>
//         <form onSubmit={onSubmit} className="space-y-4">
//           <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
//           <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
//           <input
//             placeholder="Password (min 8)"
//             type="password"
//             value={password}
//             onChange={(e) => setPassword(e.target.value)}
//             className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
//           />
//           <button disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-50">{loading ? 'Creating…' : 'Create owner account'}</button>
//           {err ? <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">{err}</div> : null}
//         </form>
//         <div className="mt-6 text-center">
//           <Link to="/login" className="text-blue-600 hover:text-blue-700 font-medium">Back to login</Link>
//         </div>
//       </div>
//     </div>
//   )
// }



import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../useAuth'

export default function OwnerSignup() {
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
        body: { name, email, password, role: 'theater_owner' },
      })
      setAuth(data)
      nav('/', { replace: true })
    } catch (e2) {
      setErr(e2.message)
    } finally {
      setLoading(false)
    }
  }

  const fieldClass =
    'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100'

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm transition-all duration-300 hover:shadow-md">
        <div className="mb-6 flex flex-col gap-2">
          <h2 className="text-3xl font-semibold tracking-tight text-slate-900">
            Join Movix Partners
          </h2>
          <p className="text-sm text-slate-500">
            Create your partner account to publish venues, experiences, and schedules.
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <input
            placeholder="Full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={fieldClass}
          />

          <input
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={fieldClass}
          />

          <input
            placeholder="Password (min 8 characters)"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={fieldClass}
          />

          <button
            disabled={loading}
            className="mt-2 inline-flex w-full items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-blue-600 hover:shadow-md active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Creating account…' : 'Create partner account'}
          </button>

          {err ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {err}
            </div>
          ) : null}
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
