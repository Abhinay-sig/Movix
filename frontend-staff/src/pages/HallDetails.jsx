import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../AuthContext'
import SeatCapModal from '../components/SeatCapModal'

function hasSeat(segmentsByRow, r, c) {
  const row = Array.isArray(segmentsByRow?.[r]) ? segmentsByRow[r] : []
  for (let i = 0; i < row.length; i += 2) {
    const start = row[i]
    const end = row[i + 1]
    if (c >= start && c <= end) return true
  }
  return false
}

export default function HallDetails() {
  const { auth } = useAuth()
  const { id } = useParams()
  const nav = useNavigate()
  const [data, setData] = useState(null)
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(false)
  const [capModalOpen, setCapModalOpen] = useState(false)

  useEffect(() => {
    if (!auth?.token || !id) return
    setLoading(true)
    setErr('')
    api(`/admin/halls/pending/${id}`, { token: auth.token })
      .then((d) => setData(d))
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false))
  }, [auth?.token, id])

  async function rejectHall() {
    if (!data?.hallId) return
    setActing(true)
    setErr('')
    try {
      await api('/admin/approvals/hall', {
        method: 'POST',
        token: auth.token,
        body: { hallId: data.hallId, approve: false },
      })
      nav('/admin/approvals', { replace: true })
    } catch (e) {
      setErr(e.message)
    } finally {
      setActing(false)
    }
  }

  const layoutRows = data?.seatLayout?.rows ?? 0
  const layoutCols = data?.seatLayout?.cols ?? 0
  const segmentsByRow = data?.seatLayout?.segmentsByRow ?? []

  const preview = useMemo(() => {
    if (!layoutRows || !layoutCols) return []
    const rows = layoutRows
    const cols = layoutCols
    return Array.from({ length: rows * cols }, (_, idx) => {
      const r = Math.floor(idx / cols)
      const c = idx % cols
      return hasSeat(segmentsByRow, r, c)
    })
  }, [layoutRows, layoutCols, segmentsByRow])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-4xl font-bold text-white">Pending Hall Details</h2>
        <Link to="/admin/approvals" className="px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-lg font-medium transition-colors">
          Back to approvals
        </Link>
      </div>

      {err ? <div className="text-red-400 bg-red-900/20 p-4 rounded-lg border border-red-900">{err}</div> : null}
      {loading ? <div className="text-gray-300 text-lg">Loading hall details…</div> : null}

      {!loading && data ? (
        <div className="space-y-6">
          <section className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Theater Info</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-700">
              <div><span className="font-semibold">Theater:</span> {data.theaterName || '—'}</div>
              <div><span className="font-semibold">Theater ID:</span> {data.theaterId || '—'}</div>
              <div><span className="font-semibold">City:</span> {data.location?.city || '—'}</div>
              <div><span className="font-semibold">Address:</span> {data.location?.address || '—'}</div>
            </div>
          </section>

          <section className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Hall Info</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-gray-700">
              <div><span className="font-semibold">Hall Name:</span> {data.hallName}</div>
              <div><span className="font-semibold">Hall ID:</span> {data.hallId}</div>
              <div><span className="font-semibold">Screen Type:</span> {data.screenType || 'Not specified'}</div>
              <div><span className="font-semibold">Total Seats:</span> <span className="text-blue-700 font-bold">{data.totalSeats}</span></div>
              <div><span className="font-semibold">Status:</span> {data.status}</div>
              <div><span className="font-semibold">Submitted:</span> {data.createdAt ? new Date(data.createdAt).toLocaleString() : '—'}</div>
            </div>
          </section>

          <section className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Seat Configuration</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border border-gray-200 rounded-lg overflow-hidden">
                <thead className="bg-gray-100 text-gray-700">
                  <tr>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Count</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.seatTypes || []).map((st) => (
                    <tr key={st.type} className="border-t border-gray-200">
                      <td className="px-4 py-3 font-medium capitalize">{st.displayName || st.type}</td>
                      <td className="px-4 py-3 font-semibold text-gray-900">{st.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Facilities</h3>
            {Array.isArray(data.facilities) && data.facilities.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {data.facilities.map((f) => (
                  <span key={f} className="px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-sm font-medium">
                    {f}
                  </span>
                ))}
              </div>
            ) : (
              <div className="text-gray-600">No facilities submitted.</div>
            )}
          </section>

          <section className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Images</h3>
            {Array.isArray(data.images) && data.images.length > 0 ? (
              <div className="space-y-2">
                {data.images.map((img) => (
                  <a
                    key={img}
                    href={img}
                    target="_blank"
                    rel="noreferrer"
                    className="block text-blue-700 hover:text-blue-800 underline break-all"
                  >
                    {img}
                  </a>
                ))}
              </div>
            ) : (
              <div className="text-gray-600">No images submitted.</div>
            )}
          </section>

          <section className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Layout Preview</h3>
            {preview.length ? (
              <div className="overflow-auto max-h-[500px] border border-gray-200 rounded-lg p-4 bg-gray-50">
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${layoutCols}, 8px)`,
                    gap: 2,
                    width: layoutCols * 10,
                  }}
                >
                  {preview.map((seat, i) => (
                    <div
                      key={i}
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 2,
                        background: seat ? '#1f2937' : '#e5e7eb',
                      }}
                    />
                  ))}
                </div>
                <div className="text-xs text-gray-500 mt-3">
                  Showing {layoutRows} rows × {layoutCols} columns.
                </div>
              </div>
            ) : (
              <div className="text-gray-600">No layout data available.</div>
            )}
          </section>

          <section className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Decision</h3>
            <div className="flex flex-wrap gap-3">
              <button disabled={acting} onClick={() => setCapModalOpen(true)} className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50">
                Approve Hall
              </button>
              <button disabled={acting} onClick={rejectHall} className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50">
                Reject Hall
              </button>
            </div>
          </section>
        </div>
      ) : null}

      <SeatCapModal
        open={capModalOpen}
        hallId={data?.hallId}
        token={auth?.token}
        onClose={() => setCapModalOpen(false)}
        onApproved={() => nav('/admin/approvals', { replace: true })}
      />
    </div>
  )
}
