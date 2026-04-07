import { useState } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../AuthContext'

export default function AdminBlocking() {
  const { auth } = useAuth()
  const [entity, setEntity] = useState('theater')
  const [id, setId] = useState('')
  const [blocked, setBlocked] = useState(true)
  const [err, setErr] = useState('')

  async function submit(e) {
    e.preventDefault()
    setErr('')
    try {
      await api('/admin/block', {
        method: 'POST',
        token: auth.token,
        body: { entity, id: Number(id), blocked },
      })
      alert('Updated.')
      setId('')
    } catch (e2) {
      setErr(e2.message)
    }
  }

  return (
    <div>
      <h2 className="text-4xl font-bold text-white mb-8">Blocking</h2>
      {err ? <div className="text-red-400 bg-red-900/20 p-4 rounded-lg border border-red-900 mb-6">{err}</div> : null}
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-md">
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-gray-700 font-medium mb-2">Entity type</label>
            <select value={entity} onChange={(e) => setEntity(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="theater">theater</option>
              <option value="hall">hall</option>
              <option value="show">show</option>
            </select>
          </div>
          <input placeholder="Entity id" value={id} onChange={(e) => setId(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer">
            <input type="checkbox" checked={blocked} onChange={(e) => setBlocked(e.target.checked)} className="w-4 h-4" />
            <span className="font-medium text-gray-700">Block this entity</span>
          </label>
          <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-colors">Apply</button>
        </form>
        <div className="mt-6 text-sm text-gray-600 bg-blue-50 p-4 rounded-lg">
          Use this to block/unblock entities from the user feed.
        </div>
      </div>
    </div>
  )
}

