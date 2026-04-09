// import { useState } from 'react'
// import { api } from '../lib/api'
// import { useAuth } from '../AuthContext'

// export default function AdminBlocking() {
//   const { auth } = useAuth()
//   const [entity, setEntity] = useState('theater')
//   const [id, setId] = useState('')
//   const [blocked, setBlocked] = useState(true)
//   const [err, setErr] = useState('')

//   async function submit(e) {
//     e.preventDefault()
//     setErr('')
//     try {
//       await api('/admin/block', {
//         method: 'POST',
//         token: auth.token,
//         body: { entity, id: Number(id), blocked },
//       })
//       alert('Updated.')
//       setId('')
//     } catch (e2) {
//       setErr(e2.message)
//     }
//   }

//   return (
//     <div>
//       <h2 className="text-4xl font-bold text-white mb-8">Blocking</h2>
//       {err ? <div className="text-red-400 bg-red-900/20 p-4 rounded-lg border border-red-900 mb-6">{err}</div> : null}
//       <div className="bg-white rounded-xl shadow-lg p-8 max-w-md">
//         <form onSubmit={submit} className="space-y-4">
//           <div>
//             <label className="block text-gray-700 font-medium mb-2">Entity type</label>
//             <select value={entity} onChange={(e) => setEntity(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
//               <option value="theater">theater</option>
//               <option value="hall">hall</option>
//               <option value="show">show</option>
//             </select>
//           </div>
//           <input placeholder="Entity id" value={id} onChange={(e) => setId(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
//           <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer">
//             <input type="checkbox" checked={blocked} onChange={(e) => setBlocked(e.target.checked)} className="w-4 h-4" />
//             <span className="font-medium text-gray-700">Block this entity</span>
//           </label>
//           <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-colors">Apply</button>
//         </form>
//         <div className="mt-6 text-sm text-gray-600 bg-blue-50 p-4 rounded-lg">
//           Use this to block/unblock entities from the user feed.
//         </div>
//       </div>
//     </div>
//   )
// }

import { useState } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../useAuth'

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

  const inputClass =
    'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100'

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
          Visibility controls
        </h2>
        <p className="text-sm text-slate-500">
          Manage what appears in the guest-facing experience across the platform.
        </p>
      </div>

      {err ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 shadow-sm">
          {err}
        </div>
      ) : null}

      <div className="max-w-xl rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
        <form onSubmit={submit} className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Content type
            </label>
            <select
              value={entity}
              onChange={(e) => setEntity(e.target.value)}
              className={inputClass}
            >
              <option value="theater">theater</option>
              <option value="hall">hall</option>
              <option value="show">show</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Listing reference
            </label>
            <input
              placeholder="Enter the listing reference"
              value={id}
              onChange={(e) => setId(e.target.value)}
              className={inputClass}
            />
          </div>

          <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 transition-colors hover:bg-slate-100">
            <input
              type="checkbox"
              checked={blocked}
              onChange={(e) => setBlocked(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-slate-700">
              Hide this listing from guests
            </span>
          </label>

          <button className="inline-flex w-full items-center justify-center rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-blue-600 hover:shadow-md active:scale-[0.98]">
            Apply
          </button>
        </form>

        <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-4 text-sm text-slate-600">
          Use this to quickly control whether a venue, auditorium, or showtime is
          visible to guests.
        </div>
      </div>
    </div>
  )
}
