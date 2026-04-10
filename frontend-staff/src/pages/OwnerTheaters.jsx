import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../useAuth'

const EMPTY_FORM = {
  name: '',
  address: '',
  city: '',
  state: '',
  pincode: '',
  amenities: '',
}

function parseAddressParts(address = '') {
  const parts = String(address)
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)

  let amenities = ''
  const amenitiesIndex = parts.findIndex((part) => part.startsWith('Amenities: '))
  const normalizedParts =
    amenitiesIndex >= 0 ? parts.filter((_, index) => index !== amenitiesIndex) : parts

  if (amenitiesIndex >= 0) {
    amenities = parts[amenitiesIndex].replace('Amenities: ', '').trim()
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

  async function load() {
    setLoading(true)

    try {
      const params = new URLSearchParams()
      if (nameFilter.trim()) params.set('name', nameFilter.trim())
      if (cityFilter.trim()) params.set('city', cityFilter.trim())
      if (stateFilter.trim()) params.set('state', stateFilter.trim())
      if (pincodeFilter.trim()) params.set('pincode', pincodeFilter.trim())

      const suffix = params.toString() ? `?${params.toString()}` : ''
      const response = await api(`/owner/me/theaters${suffix}`, { token: auth.token })
      setTheaters(response.theaters || [])
      setErr('')
    } catch (e) {
      setErr(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
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
    const parsed = parseAddressParts(theater.address)

    setErr('')
    setNotice('')
    setEditingId(theater.id)
    setShowForm(true)
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

    if (
      !editingId &&
      (!form.name.trim() ||
        !form.address.trim() ||
        !form.city.trim() ||
        !form.state.trim() ||
        !form.pincode.trim())
    ) {
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

        setTheaters((prev) =>
          prev.map((theater) => (theater.id === editingId ? response.theater : theater))
        )
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
      setNotice('Theater deleted successfully.')
    } catch (e) {
      setErr(e.message)
    }
  }

  const inputClass =
    'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100'

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <div className="staff-chip">Partner Space</div>
            <h2 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
              My theaters
            </h2>
            <p className="max-w-2xl text-sm leading-6 text-slate-500">
              Create theaters, keep amenities updated, and jump into hall management once venues are approved.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 px-5 py-4 shadow-sm">
              <div className="text-xs uppercase tracking-[0.18em] text-slate-400">
                Total theaters
              </div>
              <div className="mt-2 text-3xl font-semibold text-slate-950">
                {theaters.length}
              </div>
            </div>

            <button
              onClick={() => {
                if (showForm) {
                  resetForm()
                } else {
                  startCreate()
                }
              }}
              className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-blue-600 hover:shadow-md active:scale-[0.98]"
            >
              {showForm ? 'Close form' : 'Add theater'}
            </button>
          </div>
        </div>
      </section>

      {err ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 shadow-sm">
          {err}
        </div>
      ) : null}

      {notice ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 shadow-sm">
          {notice}
        </div>
      ) : null}

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-slate-900">Search and filter</h3>
          <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-medium text-slate-500 ring-1 ring-slate-200">
            Live results
          </span>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <input
            value={nameFilter}
            onChange={(e) => setNameFilter(e.target.value)}
            placeholder="Theater name"
            className={inputClass}
          />
          <input
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            placeholder="City"
            className={inputClass}
          />
          <input
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
            placeholder="State"
            className={inputClass}
          />
          <input
            value={pincodeFilter}
            onChange={(e) => setPincodeFilter(e.target.value)}
            placeholder="Pincode"
            className={inputClass}
          />
        </div>
      </section>

      {showForm ? (
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <div className="mb-6 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-semibold text-slate-900">
                {editingId ? 'Edit theater' : 'Add a new theater'}
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                {editingId
                  ? 'Only amenities can be updated after submission.'
                  : 'New theaters are submitted for admin approval before they go live.'}
              </p>
            </div>
          </div>

          <form onSubmit={submit} className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <input
                placeholder="Theater name"
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
                className={inputClass}
                readOnly={Boolean(editingId)}
                required
              />
              <input
                placeholder="City"
                value={form.city}
                onChange={(e) => updateField('city', e.target.value)}
                className={inputClass}
                readOnly={Boolean(editingId)}
                required
              />
            </div>

            <input
              placeholder="Street address"
              value={form.address}
              onChange={(e) => updateField('address', e.target.value)}
              className={inputClass}
              readOnly={Boolean(editingId)}
              required
            />

            <div className="grid gap-4 md:grid-cols-2">
              <input
                placeholder="State"
                value={form.state}
                onChange={(e) => updateField('state', e.target.value)}
                className={inputClass}
                readOnly={Boolean(editingId)}
                required
              />
              <input
                placeholder="Pincode"
                value={form.pincode}
                onChange={(e) => updateField('pincode', e.target.value)}
                className={inputClass}
                readOnly={Boolean(editingId)}
                required
              />
            </div>

            <textarea
              placeholder="Amenities"
              value={form.amenities}
              onChange={(e) => updateField('amenities', e.target.value)}
              rows={4}
              className={inputClass}
            />

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                disabled={saving}
                className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-blue-600 hover:shadow-md active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving
                  ? 'Saving…'
                  : editingId
                    ? 'Update theater'
                    : 'Submit theater'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-700 transition-all duration-200 hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-slate-900">Your theaters</h3>
          <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-medium text-slate-500 ring-1 ring-slate-200">
            {loading ? 'Loading' : `${theaters.length} results`}
          </span>
        </div>

        {loading ? (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center text-sm text-slate-500 shadow-sm">
            Loading theaters…
          </div>
        ) : theaters.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center text-sm text-slate-500 shadow-sm">
            No theaters matched your filters.
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {theaters.map((theater) => (
              <article
                key={theater.id}
                className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-2">
                      <Link
                        to={`/owner/theatres/${theater.id}/halls`}
                        className="text-xl font-semibold text-slate-900 transition-colors hover:text-blue-600"
                      >
                        {theater.name}
                      </Link>
                      <div className="text-sm leading-6 text-slate-500">
                        {theater.address} • {theater.city}
                      </div>
                    </div>

                    <span
                      className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-medium ring-1 ${
                        theater.isBlocked
                          ? 'bg-amber-50 text-amber-700 ring-amber-200'
                          : 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                      }`}
                    >
                      {theater.isBlocked ? 'Pending admin approval' : 'Approved'}
                    </span>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Link
                      to={`/owner/theatres/${theater.id}/halls`}
                      className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition-all duration-200 hover:bg-blue-600"
                    >
                      Manage halls
                    </Link>
                    <button
                      type="button"
                      onClick={() => startEdit(theater)}
                      className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-all duration-200 hover:bg-slate-50"
                    >
                      Edit amenities
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(theater.id)}
                      className="inline-flex items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-700 transition-all duration-200 hover:bg-rose-100"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
