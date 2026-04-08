import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../AuthContext'

export default function AdminDashboard() {
  const { auth } = useAuth()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [err, setErr] = useState('')

  function loadDashboard() {
    return api('/admin/dashboard/revenue', { token: auth.token })
      .then(setData)
      .catch((e) => setErr(e.message))
  }

  useEffect(() => {
    loadDashboard()
  }, [auth.token])

  return (
    <div>
      <h2 className="text-4xl font-bold text-white mb-8">Admin dashboard</h2>
      {err ? <div className="text-red-400 bg-red-900/20 p-4 rounded-lg border border-red-900 mb-6">{err}</div> : null}
      {!data ? (
        <div className="text-gray-300 text-lg">Loading…</div>
      ) : (
        <div className="space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-lg p-8">
              <div className="text-gray-600 text-sm font-medium mb-2">Gross Revenue</div>
              <div className="text-4xl font-bold text-blue-600">₹{data.grossRevenue}</div>
            </div>
            <div className="bg-white rounded-xl shadow-lg p-8">
              <div className="text-gray-600 text-sm font-medium mb-2">Admin Revenue (5%)</div>
              <div className="text-4xl font-bold text-green-600">₹{data.adminRevenue}</div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">Top 5 theaters</h3>
            <div className="space-y-4">
              {data.top5.map((t) => (
                <div key={t.theaterId} className="border-l-4 border-blue-600 pl-4 p-4 bg-gray-50 rounded-r-lg hover:bg-gray-100 transition-colors">
                  <div className="font-bold text-gray-900">{t.name || `Theater #${t.theaterId}`}</div>
                  <div className="flex justify-between items-center mt-2">
                    <div className="text-gray-600">₹{t.total}</div>
                    <div className="text-sm text-gray-500">{t.contributionPct.toFixed(2)}% of total</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}
    </div>
  )
}