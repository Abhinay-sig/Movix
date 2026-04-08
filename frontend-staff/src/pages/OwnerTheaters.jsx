import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../AuthContext'

export default function OwnerTheaters() {
  const { auth } = useAuth()
  const [theaters, setTheaters] = useState([])
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [err, setErr] = useState('')

  async function load() {
    const d = await api('/owner/me/theaters', { token: auth.token })
    setTheaters(d.theaters || [])
  }

  useEffect(() => {
    load().catch((e) => setErr(e.message))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function create(e) {
    e.preventDefault()
    setErr('')
    try {
      await api('/owner/theaters', {
        method: 'POST',
        token: auth.token,
        body: { name, address, city },
      })
      setName('')
      setAddress('')
      setCity('')
      await load()
    } catch (e2) {
      setErr(e2.message)
    }
  }

  return (
    <div className="space-y-8">
      <h2 className="text-4xl font-bold text-white mb-8">My theaters</h2>
      {err ? <div className="text-red-400 bg-red-900/20 p-4 rounded-lg border border-red-900">{err}</div> : null}
      <div className="bg-white rounded-xl shadow-lg p-8">
        <h3 className="text-lg font-bold text-gray-900 mb-6">Create new theater</h3>
        <form onSubmit={create} className="space-y-4 max-w-md">
          <input placeholder="Theater name" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <input placeholder="Address" value={address} onChange={(e) => setAddress(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <input placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-colors">Create theater</button>
        </form>
      </div>
      <div className="space-y-4">
        <h3 className="text-xl font-bold text-white">All theaters</h3>
        {theaters.length === 0 ? (
          <div className="text-gray-300 bg-white/10 p-6 rounded-lg text-center">No theaters created yet</div>
        ) : (
          <div className="grid gap-4">
            {theaters.map((t) => (
              <Link
                key={t.id}
                to={`/owner/theatres/${t.id}/halls`}
                className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow block"
              >
                <div className="text-xl font-bold text-gray-900">{t.name}</div>
                <div className="text-gray-600 text-sm mt-2">
                  {t.address}, {t.city}
                </div>
                <div className="text-blue-600 text-sm font-medium mt-4">View halls</div>
                <div className="text-gray-400 text-xs mt-3">ID: {t.id}</div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
