import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../AuthContext'

export default function ShowDetails() {
  const { auth } = useAuth()
  const { id } = useParams()
  const nav = useNavigate()
  const [data, setData] = useState(null)
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(false)

  useEffect(() => {
    if (!auth?.token || !id) return
    setLoading(true)
    setErr('')
    api(`/admin/shows/pending/${id}`, { token: auth.token })
      .then((d) => setData(d))
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false))
  }, [auth?.token, id])

  async function decide(approve) {
    if (!data?.show?.showId) return
    setActing(true)
    setErr('')
    try {
      await api('/admin/approvals/show', {
        method: 'POST',
        token: auth.token,
        body: { showId: data.show.showId, approve },
      })
      nav('/admin/approvals', { replace: true })
    } catch (e) {
      setErr(e.message)
    } finally {
      setActing(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-4xl font-bold text-white">Pending Show Details</h2>
        <Link to="/admin/approvals" className="px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-lg font-medium transition-colors">
          Back to approvals
        </Link>
      </div>

      {err ? <div className="text-red-400 bg-red-900/20 p-4 rounded-lg border border-red-900">{err}</div> : null}
      {loading ? <div className="text-gray-300 text-lg">Loading show details…</div> : null}

      {!loading && data ? (
        <div className="space-y-6">
          <section className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Movie Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-700">
              <div><span className="font-semibold">Title:</span> <span className="text-gray-900 font-bold">{data.movie?.title || '—'}</span></div>
              <div><span className="font-semibold">Movie ID:</span> {data.movie?.movieId || '—'}</div>
              <div><span className="font-semibold">Duration:</span> {data.movie?.duration ? `${data.movie.duration} mins` : '—'}</div>
              <div><span className="font-semibold">Genre:</span> {data.movie?.genre || 'Not provided'}</div>
              <div><span className="font-semibold">Language:</span> <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">{data.movie?.language || '—'}</span></div>
              <div><span className="font-semibold">Certification:</span> {data.movie?.certification || 'Not provided'}</div>
            </div>
            {data.movie?.poster ? (
              <a href={data.movie.poster} target="_blank" rel="noreferrer" className="inline-block mt-4 text-blue-700 hover:text-blue-800 underline break-all">
                View Poster
              </a>
            ) : null}
          </section>

          <section className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Theater & Hall</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-700">
              <div><span className="font-semibold">Theater:</span> {data.theater?.theaterName || '—'}</div>
              <div><span className="font-semibold">Hall:</span> {data.hall?.hallName || '—'}</div>
              <div><span className="font-semibold">City:</span> {data.theater?.location?.city || '—'}</div>
              <div><span className="font-semibold">Address:</span> {data.theater?.location?.address || '—'}</div>
              <div>
                <span className="font-semibold">Screen Type:</span>{' '}
                <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-sm">
                  {data.hall?.screenType || 'Not specified'}
                </span>
              </div>
              <div><span className="font-semibold">Total Seats:</span> {data.hall?.totalSeats ?? '—'}</div>
            </div>
          </section>

          <section className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Show Timing</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-700">
              <div><span className="font-semibold">Show ID:</span> {data.show?.showId}</div>
              <div><span className="font-semibold">Status:</span> {data.approvalStatus}</div>
              <div><span className="font-semibold">Date:</span> {data.show?.showDate ? new Date(data.show.showDate).toLocaleDateString() : '—'}</div>
              <div><span className="font-semibold">Start Time:</span> {data.show?.showTime ? new Date(data.show.showTime).toLocaleTimeString() : '—'}</div>
              <div><span className="font-semibold">End Time:</span> {data.show?.endTime ? new Date(data.show.endTime).toLocaleTimeString() : '—'}</div>
              <div>
                <span className="font-semibold">Format:</span>{' '}
                <span className="px-2 py-1 bg-emerald-100 text-emerald-800 rounded-full text-sm">{data.show?.format || '—'}</span>
              </div>
            </div>
          </section>

          <section className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Pricing</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border border-gray-200 rounded-lg overflow-hidden">
                <thead className="bg-gray-100 text-gray-700">
                  <tr>
                    <th className="px-4 py-3">Seat Type</th>
                    <th className="px-4 py-3">Price</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.pricing || []).map((p) => (
                    <tr key={p.seatTypeCode || p.seatTypeName} className="border-t border-gray-200">
                      <td className="px-4 py-3">{p.seatTypeName}</td>
                      <td className="px-4 py-3 font-semibold text-green-700">₹{p.price}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Availability</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-blue-50">
                <div className="text-sm text-gray-600">Total Seats</div>
                <div className="text-2xl font-bold text-blue-700">{data.availability?.totalSeats ?? 0}</div>
              </div>
              <div className="p-4 rounded-lg bg-green-50">
                <div className="text-sm text-gray-600">Available Seats</div>
                <div className="text-2xl font-bold text-green-700">{data.availability?.availableSeats ?? 0}</div>
              </div>
              <div className="p-4 rounded-lg bg-amber-50">
                <div className="text-sm text-gray-600">Blocked Seats</div>
                <div className="text-2xl font-bold text-amber-700">{data.availability?.blockedSeats ?? 0}</div>
              </div>
            </div>
          </section>

          <section className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Decision</h3>
            <div className="flex flex-wrap gap-3">
              <button disabled={acting} onClick={() => decide(true)} className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50">
                Approve Show
              </button>
              <button disabled={acting} onClick={() => decide(false)} className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50">
                Reject Show
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  )
}

