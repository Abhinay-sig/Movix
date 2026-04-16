import { useEffect, useState } from 'react'
import { buildTicketQrDataUrl } from '../lib/ticketQr'

export default function TicketQrCard({ ticket, title = 'Entry QR', subtitle = 'Show this QR at the hall entrance for scanning.' }) {
  const [qrUrl, setQrUrl] = useState('')

  useEffect(() => {
    let alive = true

    buildTicketQrDataUrl(ticket)
      .then((url) => {
        if (alive) setQrUrl(url)
      })
      .catch(() => {
        if (alive) setQrUrl('')
      })

    return () => {
      alive = false
    }
  }, [ticket])

  return (
    <div className="rounded-[1.75rem] border border-blue-200 bg-white/95 p-5 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">{title}</div>
      <div className="mt-2 text-sm leading-6 text-slate-600">{subtitle}</div>
      <div className="mt-4 flex justify-center rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
        {qrUrl ? (
          <img src={qrUrl} alt="Booking entry QR code" className="h-44 w-44 rounded-xl bg-white p-2 shadow-sm" />
        ) : (
          <div className="flex h-44 w-44 items-center justify-center rounded-xl bg-white text-sm text-slate-400 shadow-sm">
            Loading QR...
          </div>
        )}
      </div>
      <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs leading-5 text-slate-600">
        Guards can scan this code to view your booking reference, show, and seat details.
      </div>
    </div>
  )
}
