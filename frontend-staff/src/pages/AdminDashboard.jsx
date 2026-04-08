// import { useEffect, useState } from 'react'
// import { api } from '../lib/api'
// import { useAuth } from '../AuthContext'

// export default function AdminDashboard() {
//   const { auth } = useAuth()
//   const [data, setData] = useState(null)
//   const [err, setErr] = useState('')

//   useEffect(() => {
//     api('/admin/dashboard/revenue', { token: auth.token })
//       .then(setData)
//       .catch((e) => setErr(e.message))
//   }, [auth.token])

//   return (
//     <div>
//       <h2 className="text-4xl font-bold text-white mb-8">Admin dashboard</h2>
//       {err ? <div className="text-red-400 bg-red-900/20 p-4 rounded-lg border border-red-900 mb-6">{err}</div> : null}
//       {!data ? (
//         <div className="text-gray-300 text-lg">Loading…</div>
//       ) : (
//         <div className="space-y-6">
//           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//             <div className="bg-white rounded-xl shadow-lg p-8">
//               <div className="text-gray-600 text-sm font-medium mb-2">Gross Revenue</div>
//               <div className="text-4xl font-bold text-blue-600">₹{data.grossRevenue}</div>
//             </div>
//             <div className="bg-white rounded-xl shadow-lg p-8">
//               <div className="text-gray-600 text-sm font-medium mb-2">Admin Revenue (5%)</div>
//               <div className="text-4xl font-bold text-green-600">₹{data.adminRevenue}</div>
//             </div>
//           </div>

//           <div className="bg-white rounded-xl shadow-lg p-8">
//             <h3 className="text-2xl font-bold text-gray-900 mb-6">Top 5 theaters</h3>
//             <div className="space-y-4">
//               {data.top5.map((t) => (
//                 <div key={t.theaterId} className="border-l-4 border-blue-600 pl-4 p-4 bg-gray-50 rounded-r-lg hover:bg-gray-100 transition-colors">
//                   <div className="font-bold text-gray-900">{t.name || `Theater #${t.theaterId}`}</div>
//                   <div className="flex justify-between items-center mt-2">
//                     <div className="text-gray-600">₹{t.total}</div>
//                     <div className="text-sm text-gray-500">{t.contributionPct.toFixed(2)}% of total</div>
//                   </div>
//                 </div>
//               ))}
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   )
// }



import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../AuthContext'

export default function AdminDashboard() {
  const { auth } = useAuth()
  const [data, setData] = useState(null)
  const [err, setErr] = useState('')

  useEffect(() => {
    api('/admin/dashboard/revenue', { token: auth.token })
      .then(setData)
      .catch((e) => setErr(e.message))
  }, [auth.token])

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
          Platform overview
        </h2>
        <p className="text-sm text-slate-500">
          Track platform performance and spotlight top-performing venues.
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
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md sm:p-8">
              <div className="mb-2 text-sm font-medium text-slate-500">
                Gross Revenue
              </div>
              <div className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                ₹{data.grossRevenue}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md sm:p-8">
              <div className="mb-2 text-sm font-medium text-slate-500">
                Platform share
              </div>
              <div className="text-3xl font-semibold tracking-tight text-emerald-600 sm:text-4xl">
                ₹{data.adminRevenue}
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
            <div className="mb-6 flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-slate-900 sm:text-xl">
                Top venues
              </h3>
              <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-medium text-slate-500 ring-1 ring-slate-200">
                Highest performing venues
              </span>
            </div>

            <div className="space-y-3">
              {data.top5.map((t, index) => (
                <div
                  key={t.theaterId}
                  className="group rounded-2xl border border-slate-200 bg-slate-50/70 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:bg-white hover:shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">
                        #{index + 1}
                      </div>
                      <div className="truncate text-base font-semibold text-slate-900">
                        {t.name || `Theater #${t.theaterId}`}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-base font-semibold text-slate-900">
                        ₹{t.total}
                      </div>
                      <div className="text-xs text-slate-500">
                        {t.contributionPct.toFixed(2)}% of total
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-300 group-hover:opacity-90"
                      style={{ width: `${Math.min(t.contributionPct, 100)}%` }}
                    />
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
