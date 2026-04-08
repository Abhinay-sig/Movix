// import { useState } from 'react'
// import { api } from '../lib/api'
// import { useAuth } from '../AuthContext'

// export default function AdminCaps() {
//   const { auth } = useAuth()
//   const [seatTypeCode, setSeatTypeCode] = useState('standard')
//   const [cap, setCap] = useState('')
//   const [err, setErr] = useState('')

//   async function submit(e) {
//     e.preventDefault()
//     setErr('')
//     try {
//       await api('/admin/seat-types/cap', {
//         method: 'POST',
//         token: auth.token,
//         body: { seatTypeCode, adminPriceCap: Number(cap) },
//       })
//       alert('Updated cap.')
//       setCap('')
//     } catch (e2) {
//       setErr(e2.message)
//     }
//   }

//   return (
//     <div>
//       <h2 className="text-4xl font-bold text-white mb-8">Seat type caps</h2>
//       {err ? <div className="text-red-400 bg-red-900/20 p-4 rounded-lg border border-red-900 mb-6">{err}</div> : null}
//       <div className="bg-white rounded-xl shadow-lg p-8 max-w-md">
//         <form onSubmit={submit} className="space-y-4">
//           <div>
//             <label className="block text-gray-700 font-medium mb-2">Seat type</label>
//             <select value={seatTypeCode} onChange={(e) => setSeatTypeCode(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
//               <option value="standard">standard</option>
//               <option value="premium">premium</option>
//               <option value="recliner">recliner</option>
//               <option value="vip">vip</option>
//             </select>
//           </div>
//           <input placeholder="New cap (number)" value={cap} onChange={(e) => setCap(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
//           <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-colors">Update cap</button>
//         </form>
//       </div>
//     </div>
//   )
// }

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

  const inputClass =
    'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100'

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
          Pricing guidance
        </h2>
        <p className="text-sm text-slate-500">
          Keep guest pricing aligned across different seating experiences.
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
              Seating experience
            </label>
            <select
              value={seatTypeCode}
              onChange={(e) => setSeatTypeCode(e.target.value)}
              className={inputClass}
            >
              <option value="standard">standard</option>
              <option value="premium">premium</option>
              <option value="recliner">recliner</option>
              <option value="vip">vip</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Suggested price ceiling
            </label>
            <input
              placeholder="Enter an amount"
              value={cap}
              onChange={(e) => setCap(e.target.value)}
              className={inputClass}
            />
          </div>

          <button className="inline-flex w-full items-center justify-center rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-blue-600 hover:shadow-md active:scale-[0.98]">
            Save pricing guide
          </button>
        </form>
      </div>
    </div>
  )
}
