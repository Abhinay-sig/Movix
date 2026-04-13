import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../AuthContext'

export default function OwnerTheaterHalls() {
  const { auth } = useAuth()
  const { theatreId } = useParams()
  const [data, setData] = useState(null)
  const [err, setErr] = useState('')

  useEffect(() => {
    let alive = true
    api(`/owner/theaters/${theatreId}/halls`, { token: auth.token })
      .then((response) => {
        if (alive) setData(response)
      })
      .catch((e) => {
        if (alive) setErr(e.message)
      })
    return () => {
      alive = false
    }
  }, [auth.token, theatreId])

  const halls = (data?.halls || []).filter((hall) => hall?.isApproved)

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Link to="/owner/theaters" className="text-green-600 hover:text-black font-medium transition-colors">
          Back to theaters
        </Link>
      </div>

      <div>
        <h2 className="text-4xl font-bold text-black mb-2">Theater halls</h2>
        {data?.theater ? (
          <div className="text-slate-800">
            {data.theater.name} • {data.theater.city}
          </div>
        ) : null}
      </div>

      {err ? <div className="text-red-400 bg-red-900/20 p-4 rounded-lg border border-red-900">{err}</div> : null}

      {!data ? (
        <div className="text-gray-300 bg-white/10 p-6 rounded-lg text-center">Loading halls…</div>
      ) : halls.length === 0 ? (
        <div className="text-gray-300 bg-white/10 p-6 rounded-lg text-center">No halls found for this theater.</div>
      ) : (
        <div className="grid gap-4">
          {halls.map((hall) => (
            <div key={hall.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
              <div className="text-xl font-bold text-gray-900">{hall.name}</div>
              <div className="text-sm text-gray-600 mt-1">
                Total Capacity: {hall.seatingCapacity ?? 0}
              </div>
              <div className="text-sm text-gray-600 mt-1">
                Seat Types:
              </div>
              <div className="text-sm text-gray-600 mt-1">
                Gold: {hall.seatTypeCounts?.gold ?? 0}
              </div>
              <div className="text-sm text-gray-600 mt-1">
                Silver: {hall.seatTypeCounts?.silver ?? 0}
              </div>
              <div className="text-sm text-gray-600 mt-1">
                Platinum: {hall.seatTypeCounts?.platinum ?? 0}
              </div>
              <div className="text-xs text-gray-400 mt-3">Hall ID: {hall.id}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
