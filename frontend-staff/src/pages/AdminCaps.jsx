import { useState } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../AuthContext'

export default function AdminCaps() {
  const { auth } = useAuth()
  const [seatTypeCode, setSeatTypeCode] = useState('standard')
  const [cap, setCap] = useState('')
  const [err, setErr] = useState('')

  async function submit(e) {
    e.preventDefault()
    setErr('')
    try {
      await api('/admin/seat-types/cap', {
        method: 'POST',
        token: auth.token,
        body: { seatTypeCode, adminPriceCap: Number(cap) },
      })
      alert('Updated cap.')
      setCap('')
    } catch (e2) {
      setErr(e2.message)
    }
  }

  return (
    <div>
      <h2 className="text-4xl font-bold text-white mb-8">Seat type caps</h2>
      {err ? <div className="text-red-400 bg-red-900/20 p-4 rounded-lg border border-red-900 mb-6">{err}</div> : null}
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-md">
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-gray-700 font-medium mb-2">Seat type</label>
            <select value={seatTypeCode} onChange={(e) => setSeatTypeCode(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="standard">standard</option>
              <option value="premium">premium</option>
              <option value="recliner">recliner</option>
              <option value="vip">vip</option>
            </select>
          </div>
          <input placeholder="New cap (number)" value={cap} onChange={(e) => setCap(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-colors">Update cap</button>
        </form>
      </div>
    </div>
  )
}

