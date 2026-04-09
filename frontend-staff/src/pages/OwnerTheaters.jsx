import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../AuthContext'

const EMPTY_FORM = {
  name: '',
  address: '',
  city: '',
  state: '',
  pincode: '',
  amenities: '',
}

export default function OwnerTheaters() {
  const { auth } = useAuth()
  const [theaters, setTheaters] = useState([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [nameFilter, setNameFilter] = useState('')
  const [cityFilter, setCityFilter] = useState('')
  const [stateFilter, setStateFilter] = useState('')
  const [pincodeFilter, setPincodeFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [notice, setNotice] = useState('')

  function parseAddressParts(address = '') {
    const parts = String(address)
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean)

    let amenities = ''
    const amenitiesMarkerIndex = parts.findIndex((part) => part.startsWith('Amenities: '))
    const normalizedParts = amenitiesMarkerIndex >= 0 ? parts.filter((_, index) => index !== amenitiesMarkerIndex) : parts
    if (amenitiesMarkerIndex >= 0) {
      amenities = parts[amenitiesMarkerIndex].replace('Amenities: ', '').trim()
    }

    if (normalizedParts.length >= 3) {
      return {
        address: normalizedParts.slice(0, -2).join(', '),
        state: normalizedParts.at(-2) || '',
        pincode: normalizedParts.at(-1) || '',
        amenities,
      }
    }

    return {
      address: address || '',
      state: '',
      pincode: '',
      amenities,
    }
  }

  async function load() {
    setLoading(true)
    const params = new URLSearchParams()
    if (nameFilter.trim()) params.set('name', nameFilter.trim())
    if (cityFilter.trim()) params.set('city', cityFilter.trim())
    if (stateFilter.trim()) params.set('state', stateFilter.trim())
    if (pincodeFilter.trim()) params.set('pincode', pincodeFilter.trim())
    const suffix = params.toString() ? `?${params.toString()}` : ''
    const data = await api(`/owner/me/theaters${suffix}`, { token: auth.token })
    setTheaters(data.theaters || [])
    setLoading(false)
  }

  useEffect(() => {
    load().catch((e) => {
      setErr(e.message)
      setLoading(false)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.token, nameFilter, cityFilter, stateFilter, pincodeFilter])

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function resetForm() {
    setForm(EMPTY_FORM)
    setShowForm(false)
    setEditingId(null)
  }

  function startCreate() {
    setErr('')
    setNotice('')
    setForm(EMPTY_FORM)
    setEditingId(null)
    setShowForm(true)
  }

  function startEdit(theater) {
    setErr('')
    setNotice('')
    setEditingId(theater.id)
    setShowForm(true)
    const parsed = parseAddressParts(theater.address)
    setForm({
      name: theater.name || '',
      address: parsed.address,
      city: theater.city || '',
      state: parsed.state,
      pincode: parsed.pincode,
      amenities: parsed.amenities,
    })
  }

  async function submit(e) {
    e.preventDefault()
    setErr('')
    setNotice('')

    if (!editingId && (!form.name.trim() || !form.address.trim() || !form.city.trim() || !form.state.trim() || !form.pincode.trim())) {
      setErr('Please fill all required fields.')
      return
    }

    setSaving(true)
    try {
      const body = {
        name: form.name.trim(),
        address: form.address.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        pincode: form.pincode.trim(),
        amenities: form.amenities.trim(),
      }

      if (editingId) {
        const response = await api(`/owner/theaters/${editingId}`, {
          method: 'PATCH',
          token: auth.token,
          body: { amenities: body.amenities },
        })
        setTheaters((prev) => prev.map((theater) => (theater.id === editingId ? response.theater : theater)))
        setNotice('Theater updated successfully.')
      } else {
        await api('/owner/theaters', {
          method: 'POST',
          token: auth.token,
          body,
        })
        setNotice('Theater submitted for admin approval.')
        await load()
      }

      resetForm()
    } catch (e2) {
      setErr(e2.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(theaterId) {
    const confirmed = window.confirm('Are you sure you want to delete this theater?')
    if (!confirmed) return

    setErr('')
    setNotice('')
    try {
      await api(`/owner/theaters/${theaterId}`, {
        method: 'DELETE',
        token: auth.token,
      })
      setTheaters((prev) => prev.filter((theater) => theater.id !== theaterId))
      if (editingId === theaterId) resetForm()
    } catch (e) {
      setErr(e.message)
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h2 className="text-4xl font-bold text-white">My theaters</h2>
        <button
          onClick={() => {
            if (showForm) {
              resetForm()
            } else {
              startCreate()
            }
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-lg transition-colors"
        >
          {showForm ? 'Close' : 'Add Theater'}
        </button>
      </div>

      {err ? <div className="text-red-400 bg-red-900/20 p-4 rounded-lg border border-red-900">{err}</div> : null}
      {notice ? <div className="text-blue-200 bg-blue-900/20 p-4 rounded-lg border border-blue-900">{notice}</div> : null}

      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-gray-700 font-medium mb-2">Theater Name</label>
            <input
              value={nameFilter}
              onChange={(e) => setNameFilter(e.target.value)}
              placeholder="Theater name"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-gray-700 font-medium mb-2">City</label>
            <input
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              placeholder="City"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-gray-700 font-medium mb-2">State</label>
            <input
              value={stateFilter}
              onChange={(e) => setStateFilter(e.target.value)}
              placeholder="State"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-gray-700 font-medium mb-2">Pincode</label>
            <input
              value={pincodeFilter}
              onChange={(e) => setPincodeFilter(e.target.value)}
              placeholder="Pincode"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {showForm ? (
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-6">{editingId ? 'Edit theater' : 'Add theater'}</h3>
          <form onSubmit={submit} className="space-y-4 max-w-3xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-700 font-medium mb-2">Theater Name</label>
                <input
                  placeholder="Theater name"
                  value={form.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  readOnly={Boolean(editingId)}
                  required
                />
              </div>
              <div>
                <label className="block text-gray-700 font-medium mb-2">City</label>
                <input
                  placeholder="City"
                  value={form.city}
                  onChange={(e) => updateField('city', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  readOnly={Boolean(editingId)}
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-gray-700 font-medium mb-2">Address</label>
              <input
                placeholder="Address"
                value={form.address}
                onChange={(e) => updateField('address', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                readOnly={Boolean(editingId)}
                required
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-700 font-medium mb-2">State</label>
                <input
                  placeholder="State"
                  value={form.state}
                  onChange={(e) => updateField('state', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  readOnly={Boolean(editingId)}
                  required
                />
              </div>
              <div>
                <label className="block text-gray-700 font-medium mb-2">Pincode</label>
                <input
                  placeholder="Pincode"
                  value={form.pincode}
                  onChange={(e) => updateField('pincode', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  readOnly={Boolean(editingId)}
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-gray-700 font-medium mb-2">Amenities</label>
              <textarea
                placeholder="Amenities"
                value={form.amenities}
                onChange={(e) => updateField('amenities', e.target.value)}
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-3">
              <button
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-lg transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving…' : editingId ? 'Update theater' : 'Create theater'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      ) : null}

      <div className="space-y-4">
        <h3 className="text-xl font-bold text-white">All theaters</h3>
        {loading ? (
          <div className="text-gray-300 bg-white/10 p-6 rounded-lg text-center">Loading theaters…</div>
        ) : theaters.length === 0 ? (
          <div className="text-gray-300 bg-white/10 p-6 rounded-lg text-center">No approved theaters found.</div>
        ) : (
          <div className="grid gap-4">
            {theaters.map((theater) => (
              <div key={theater.id} className="bg-white rounded-xl shadow-md p-6">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div className="space-y-2">
                    <Link to={`/owner/theatres/${theater.id}/halls`} className="text-xl font-bold text-gray-900 hover:text-blue-600 transition-colors">
                      {theater.name}
                    </Link>
                    <div className="text-sm text-gray-600">
                      {theater.address} • {theater.city}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => startEdit(theater)}
                      className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white font-medium rounded-lg transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(theater.id)}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
