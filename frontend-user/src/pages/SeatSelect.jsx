// import { useEffect, useMemo, useState } from 'react'
// import { useNavigate, useParams } from 'react-router-dom'
// import { api } from '../lib/api'
// import { useAuth } from '../AuthContext'
// import { hasSeat, seatCode } from '../lib/seatLayout'

// export default function SeatSelect() {
//   const { auth } = useAuth()
//   const { showId } = useParams()
//   const nav = useNavigate()

//   const [data, setData] = useState(null)
//   const [err, setErr] = useState('')
//   const [selected, setSelected] = useState(() => new Set())
//   const selectedArr = useMemo(() => Array.from(selected), [selected])

//   useEffect(() => {
//     let alive = true
//     api(`/public/shows/${showId}/seatmap`)
//       .then((d) => alive && setData(d))
//       .catch((e) => alive && setErr(e.message))
//     return () => {
//       alive = false
//     }
//   }, [showId])

//   const booked = useMemo(() => new Set(data?.bookedSeats || []), [data])
//   const held = useMemo(() => new Set(data?.heldSeats || []), [data])

//   function toggle(seat) {
//     if (booked.has(seat) || held.has(seat)) return
//     setSelected((prev) => {
//       const next = new Set(prev)
//       if (next.has(seat)) next.delete(seat)
//       else {
//         if (next.size >= 10) {
//           alert('You can select max 10 seats.')
//           return prev
//         }
//         next.add(seat)
//       }
//       return next
//     })
//   }

//   async function proceed() {
//     if (selected.size < 1) {
//       alert('Select at least 1 seat.')
//       return
//     }
//     // create hold first, then go to payment
//     try {
//       const hold = await api('/holds', {
//         method: 'POST',
//         token: auth.token,
//         body: { showId: Number(showId), seatCodes: selectedArr },
//       })
//       nav(`/shows/${showId}/payment`, { state: { seatCodes: selectedArr, expiresAt: hold.expiresAt } })
//     } catch (e) {
//       alert(e.message)
//       // refresh seatmap
//       api(`/public/shows/${showId}/seatmap`).then(setData).catch(() => {})
//     }
//   }

//   if (err) return <div className="text-red-400 bg-red-900/20 p-4 rounded-lg border border-red-900">{err}</div>
//   if (!data) return <div className="text-gray-300 text-lg">Loading…</div>

//   const rows = data.layout.rows
//   const cols = data.layout.cols
//   const segmentsByRow = data.layout.segmentsByRow

//   return (
//     <div className="space-y-6">
//       <h2 className="text-4xl font-bold text-white mb-8">Select your seats</h2>
//       <div className="bg-white rounded-xl shadow-lg p-8">
//         <div className="mb-6 p-4 bg-blue-50 rounded-lg border-l-4 border-blue-600">
//           <div className="text-sm text-gray-700 space-y-2">
//             <div><span className="inline-block w-4 h-4 bg-white border border-gray-300 rounded mr-2"></span>Available</div>
//             <div><span className="inline-block w-4 h-4 bg-gray-400 rounded mr-2"></span>Booked / Held</div>
//             <div><span className="inline-block w-4 h-4 bg-blue-600 rounded mr-2"></span>Selected by you</div>
//           </div>
//         </div>

//         <div className="overflow-auto p-6 bg-gray-50 rounded-lg border border-gray-200">
//           <div
//             style={{
//               display: 'grid',
//               gridTemplateColumns: `repeat(${cols}, 16px)`,
//               gap: 2,
//               width: cols * 18,
//             }}
//           >
//             {Array.from({ length: rows * cols }).map((_, idx) => {
//               const r = Math.floor(idx / cols)
//               const c = idx % cols
//               if (!hasSeat(segmentsByRow, r, c)) {
//                 return <div key={idx} style={{ width: 14, height: 14 }} />
//               }
//               const code = seatCode(r, c)
//               const isDisabled = booked.has(code) || held.has(code)
//               const isSel = selected.has(code)
//               const bg = isDisabled ? '#9ca3af' : isSel ? '#2563eb' : '#fff'
//               return (
//                 <button
//                   key={idx}
//                   onClick={() => toggle(code)}
//                   title={code}
//                   style={{
//                     width: 14,
//                     height: 14,
//                     padding: 0,
//                     borderRadius: 3,
//                     border: '1px solid #999',
//                     background: bg,
//                     cursor: isDisabled ? 'not-allowed' : 'pointer',
//                   }}
//                   disabled={isDisabled}
//                   className="hover:scale-110 transition-transform"
//                 />
//               )
//             })}
//           </div>
//         </div>
//       </div>

//       <div className="bg-white rounded-xl shadow-lg p-8">
//         <div className="space-y-4">
//           <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
//             <div className="text-lg font-semibold text-gray-900">
//               Selected seats: <span className="text-blue-600">{selected.size}</span>
//             </div>
//             <div className="mt-3 sm:mt-0">
//               <div className="text-sm text-gray-600 mb-2">Your selection:</div>
//               <div className="font-mono text-sm font-medium text-gray-900 bg-gray-50 p-2 rounded border border-gray-300">
//                 {selectedArr.sort().join(', ') || 'No seats selected'}
//               </div>
//             </div>
//           </div>
//           <button onClick={proceed} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-50" disabled={selected.size === 0}>
//             Proceed to payment
//           </button>
//         </div>
//       </div>
//     </div>
//   )
// }




import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../AuthContext'
import { hasSeat, seatCode } from '../lib/seatLayout'

export default function SeatSelect() {
  const { auth } = useAuth()
  const { showId } = useParams()
  const nav = useNavigate()

  const [data, setData] = useState(null)
  const [err, setErr] = useState('')
  const [selected, setSelected] = useState(() => new Set())
  const selectedArr = useMemo(() => Array.from(selected), [selected])

  useEffect(() => {
    let alive = true
    api(`/public/shows/${showId}/seatmap`)
      .then((d) => alive && setData(d))
      .catch((e) => alive && setErr(e.message))
    return () => (alive = false)
  }, [showId])

  const booked = useMemo(() => new Set(data?.bookedSeats || []), [data])
  const held = useMemo(() => new Set(data?.heldSeats || []), [data])

  function toggle(seat) {
    if (booked.has(seat) || held.has(seat)) return
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(seat)) next.delete(seat)
      else {
        if (next.size >= 10) {
          alert('You can select max 10 seats.')
          return prev
        }
        next.add(seat)
      }
      return next
    })
  }

  async function proceed() {
    if (selected.size < 1) {
      alert('Select at least 1 seat.')
      return
    }
    try {
      const hold = await api('/holds', {
        method: 'POST',
        token: auth.token,
        body: { showId: Number(showId), seatCodes: selectedArr },
      })
      nav(`/shows/${showId}/payment`, {
        state: { seatCodes: selectedArr, expiresAt: hold.expiresAt },
      })
    } catch (e) {
      alert(e.message)
      api(`/public/shows/${showId}/seatmap`).then(setData).catch(() => {})
    }
  }

  if (err)
    return (
      <div className="text-sm text-red-600 bg-red-50 border border-red-200 px-4 py-3 rounded-xl">
        {err}
      </div>
    )

  if (!data)
    return (
      <div className="text-center text-gray-500 py-10">
        Loading seats...
      </div>
    )

  const rows = data.layout.rows
  const cols = data.layout.cols
  const segmentsByRow = data.layout.segmentsByRow

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-10 md:px-6">
      <section className="page-panel fade-up px-6 py-8 md:px-10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <div className="hero-chip">Seat Picker</div>
            <h2 className="section-title max-w-2xl">
              Select your seats
            </h2>
            <p className="section-copy max-w-xl">
              Pick your preferred seats for this show. Unavailable seats have
              already been taken.
            </p>
          </div>

          <div className="rounded-[1.75rem] border border-violet-100 bg-gradient-to-br from-violet-50 to-blue-50 px-5 py-4 shadow-sm">
            <div className="text-xs uppercase tracking-[0.18em] text-slate-400">
              Selection count
            </div>
            <div className="mt-2 text-3xl font-semibold text-slate-950">
              {selected.size}
            </div>
          </div>
        </div>
      </section>

      <div>
        <h2 className="text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl">
          Select your seats
        </h2>
        <p className="section-copy mt-2">
          Tap seats below to build your selection.
        </p>
      </div>

      <div className="page-panel overflow-hidden px-6 py-8 md:px-8">
        <div className="text-center">
          <div className="text-xs uppercase tracking-[0.22em] text-slate-400">
            Screen
          </div>
          <div className="mx-auto mt-4 h-20 w-full max-w-xl rounded-[50%] border border-fuchsia-100 bg-gradient-to-b from-blue-100 via-violet-100 to-pink-50 shadow-[0_20px_40px_rgba(96,165,250,0.16)]" />
        </div>

        <div className="overflow-auto rounded-[1.75rem] border border-slate-200 bg-gradient-to-b from-white to-slate-50 px-4 py-6">
          <div className="mb-6 flex justify-center">
            <div className="rounded-full border border-sky-100 bg-gradient-to-r from-sky-50 to-violet-50 px-4 py-2 text-xs font-medium text-slate-500 shadow-sm">
              Tap or click seats to add or remove them
            </div>
          </div>

          <div
            className="mx-auto"
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${cols}, 18px)`,
              gap: 6,
            }}
          >
            {Array.from({ length: rows * cols }).map((_, idx) => {
              const r = Math.floor(idx / cols)
              const c = idx % cols

              if (!hasSeat(segmentsByRow, r, c)) {
                return <div key={idx} />
              }

              const code = seatCode(r, c)
              const isDisabled = booked.has(code) || held.has(code)
              const isSel = selected.has(code)

              return (
                <button
                  key={idx}
                  onClick={() => toggle(code)}
                  disabled={isDisabled}
                  title={code}
                  className={`
                    h-4 w-4 rounded-[0.4rem] border transition-all duration-200
                    ${isDisabled ? 'cursor-not-allowed border-slate-300 bg-slate-300 opacity-80' : ''}
                    ${isSel ? 'scale-110 border-slate-950 bg-slate-950 shadow-[0_0_0_4px_rgba(15,23,42,0.08)]' : 'border-slate-300 bg-white hover:-translate-y-0.5 hover:border-blue-300 hover:bg-blue-50'}
                  `}
                />
              )
            })}
          </div>
        </div>

        <div className="flex flex-wrap gap-3 text-xs font-medium text-slate-500">
          <div className="rounded-full border border-sky-100 bg-sky-50/90 px-4 py-2 shadow-sm">
            <span className="mr-2 inline-block h-3 w-3 rounded bg-white align-middle ring-1 ring-slate-300" />
            Available
          </div>
          <div className="rounded-full border border-slate-200 bg-slate-100/90 px-4 py-2 shadow-sm">
            <span className="mr-2 inline-block h-3 w-3 rounded bg-slate-300 align-middle" />
            Booked
          </div>
          <div className="rounded-full border border-violet-100 bg-violet-50/90 px-4 py-2 shadow-sm">
            <span className="mr-2 inline-block h-3 w-3 rounded bg-slate-950 align-middle" />
            Selected
          </div>
        </div>
      </div>

      <div className="page-panel px-6 py-8 md:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-slate-500">
            Selected seats
            <div className="mt-1 text-2xl font-semibold text-slate-950">
              {selected.size}
            </div>
          </div>

          <div className="w-full text-sm text-slate-500 sm:w-auto">
            <div className="mb-2">Your selection</div>
            <div className="rounded-2xl border border-slate-200 bg-white/85 px-4 py-3 font-mono text-xs text-slate-900 shadow-sm">
              {selectedArr.sort().join(', ') || 'None'}
            </div>
          </div>
        </div>

        <button
          onClick={proceed}
          disabled={selected.size === 0}
          className="primary-button mt-6 w-full"
        >
          Proceed to payment
        </button>
      </div>
    </div>
  )
}
