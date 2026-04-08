import { useEffect, useState } from 'react'
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
    <div className="mx-auto max-w-5xl space-y-10 px-4 py-10 md:px-6">
      <section className="staff-panel fade-up px-6 py-8 md:px-10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <div className="staff-chip">Partner Space</div>
            <h2 className="staff-title">My Theaters</h2>
            <p className="staff-copy max-w-xl">
              Create and manage the venues guests will discover across Movix.
            </p>
          </div>

          <div className="rounded-[1.75rem] border border-slate-200 bg-white/85 px-5 py-4 shadow-sm">
            <div className="text-xs uppercase tracking-[0.18em] text-slate-400">
              Total venues
            </div>
            <div className="mt-2 text-3xl font-semibold text-slate-950">
              {theaters.length}
            </div>
          </div>
        </div>
      </section>

      {err && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {err}
        </div>
      )}

      <div className="staff-card p-6 md:p-8">
        <h3 className="mb-6 text-lg font-medium text-gray-900">Add a New Venue</h3>

        <form onSubmit={create} className="max-w-md space-y-4">
          <input
            placeholder="Venue name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="staff-input"
          />

          <input
            placeholder="Street address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="staff-input"
          />

          <input
            placeholder="City"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="staff-input"
          />

          <button className="staff-primary w-full">Save venue</button>
        </form>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Your venues</h3>

        {theaters.length === 0 ? (
          <div className="staff-card border-dashed p-8 text-center text-gray-500">
            Your venues will appear here once they are added.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {theaters.map((t) => (
              <div key={t.id} className="staff-card p-5">
                <div className="text-lg font-medium text-gray-900">{t.name}</div>
                <div className="mt-1 text-sm text-gray-500">
                  {t.address}, {t.city}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
