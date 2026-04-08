// import { useEffect, useState } from 'react'
// import { api } from '../lib/api'
// import { useAuth } from '../AuthContext'

// export default function OwnerRevenue() {
//   const { auth } = useAuth()
//   const [data, setData] = useState(null)
//   const [err, setErr] = useState('')

//   useEffect(() => {
//     api('/owner/me/revenue', { token: auth.token })
//       .then(setData)
//       .catch((e) => setErr(e.message))
//   }, [auth.token])

//   return (
//     <div>
//       <h2 className="text-4xl font-bold text-white mb-8">Revenue</h2>
//       {err ? <div className="text-red-400 bg-red-900/20 p-4 rounded-lg border border-red-900 mb-6">{err}</div> : null}
//       {!data ? (
//         <div className="text-gray-300 text-lg">Loading…</div>
//       ) : (
//         <div className="bg-white rounded-xl shadow-lg p-8 max-w-md">
//           <div className="text-gray-600 text-lg mb-2">Total Revenue</div>
//           <div className="text-4xl font-bold text-blue-600">₹{data.totalRevenue}</div>
//         </div>
//       )}
//     </div>
//   )
// }

import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../useAuth'

export default function OwnerRevenue() {
  const { auth } = useAuth()
  const [data, setData] = useState(null)
  const [err, setErr] = useState('')

  useEffect(() => {
    api('/owner/me/revenue', { token: auth.token })
      .then(setData)
      .catch((e) => setErr(e.message))
  }, [auth.token])

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
          Business performance
        </h2>
        <p className="text-sm text-slate-500">
          A quick look at how your venues are performing.
        </p>
      </div>

      {err ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 shadow-sm">
          {err}
        </div>
      ) : null}

      {!data ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-8 text-sm text-slate-500 shadow-sm">
          Loading…
        </div>
      ) : (
        <div className="max-w-md">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md sm:p-8">
            <div className="mb-2 text-sm font-medium text-slate-500">
              Total earnings
            </div>
            <div className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
              ₹{data.totalRevenue}
            </div>

            <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-200">
              <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500" />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
