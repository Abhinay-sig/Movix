import { useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api'

const REASONS = [
  { value: 'pricing_issue', label: 'Pricing issue' },
  { value: 'incorrect_show_timing', label: 'Incorrect show timing' },
  { value: 'invalid_movie_details', label: 'Invalid movie details' },
  { value: 'hall_not_approved', label: 'Hall not approved' },
  { value: 'duplicate_show', label: 'Duplicate show' },
  { value: 'other', label: 'Other' },
]

const CAP_SEAT_TYPES = ['Standard', 'Premium', 'Recliner', 'VIP']

export default function ShowRejectModal({ open, show, token, submitting, onClose, onSubmit }) {
  const [reason, setReason] = useState('')
  const [comment, setComment] = useState('')
  const [err, setErr] = useState('')
  const [caps, setCaps] = useState({})
  const [capsLoading, setCapsLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    setReason('')
    setComment('')
    setErr('')
    setCaps({})
  }, [open])

  useEffect(() => {
    if (!open || !show?.id || !token) return
    setCapsLoading(true)
    api(`/admin/shows/pending/${show.id}`, { token })
      .then((d) => {
        const bySeatName = {}
        for (const row of d?.pricing || []) {
          const key = String(row.seatTypeName || '').trim()
          if (!key) continue
          const val = row.adminPriceCap ?? row.capPrice ?? null
          if (val != null && Number.isFinite(Number(val))) bySeatName[key] = String(Number(val))
        }
        setCaps((prev) => {
          const next = { ...prev }
          for (const seatType of CAP_SEAT_TYPES) {
            if (next[seatType] != null) continue
            if (bySeatName[seatType] != null) next[seatType] = bySeatName[seatType]
          }
          return next
        })
      })
      .catch(() => {})
      .finally(() => setCapsLoading(false))
  }, [open, show?.id, token])

  const isOther = reason === 'other'
  const isPricingIssue = reason === 'pricing_issue'
  const missingPricingCap = useMemo(
    () => CAP_SEAT_TYPES.find((type) => !String(caps[type] ?? '').trim()),
    [caps]
  )

  if (!open) return null

  function submit() {
    if (!reason) {
      setErr('Please select a rejection reason.')
      return
    }
    if (isPricingIssue && missingPricingCap) {
      setErr(`Please enter cap for ${missingPricingCap}.`)
      return
    }
    if (isPricingIssue) {
      const invalidType = CAP_SEAT_TYPES.find((type) => {
        const val = Number(caps[type])
        return !Number.isFinite(val) || val <= 0
      })
      if (invalidType) {
        setErr(`Please enter a valid cap for ${invalidType}.`)
        return
      }
    }
    if (isOther && !comment.trim()) {
      setErr('Please add a custom rejection message.')
      return
    }
    setErr('')
    const suggestedCaps = isPricingIssue
      ? CAP_SEAT_TYPES.reduce((acc, type) => {
          acc[type] = Number(caps[type])
          return acc
        }, {})
      : undefined
    onSubmit?.({ reason, comment: comment.trim(), suggestedCaps })
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-white rounded-xl shadow-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-xl font-bold text-gray-900">Reject Show</h3>
          <button onClick={onClose} className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 text-gray-800">
            Close
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="text-sm text-gray-600">
            {show ? `Show #${show.id}${show.movieTitle ? ` • ${show.movieTitle}` : ''}` : 'Select rejection reason'}
          </div>

          {err ? <div className="text-red-600 bg-red-50 border border-red-200 p-3 rounded-lg">{err}</div> : null}

          <div>
            <label className="block text-gray-700 font-medium mb-2">Reason</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select reason</option>
              {REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          {isPricingIssue ? (
            <div>
              <div className="text-gray-700 font-medium mb-2">Suggested Seat Caps</div>
              <div className="text-xs text-gray-500 mb-3">Prefilled with current admin caps where available.</div>
              {capsLoading ? <div className="text-sm text-gray-500 mb-3">Loading current caps…</div> : null}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {CAP_SEAT_TYPES.map((type) => (
                  <label key={type} className="block">
                    <span className="block text-sm text-gray-700 mb-1">{type}</span>
                    <input
                      type="number"
                      min="1"
                      step="0.01"
                      value={caps[type] ?? ''}
                      onChange={(e) => setCaps((prev) => ({ ...prev, [type]: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </label>
                ))}
              </div>
            </div>
          ) : null}

          {isOther ? (
            <div>
              <label className="block text-gray-700 font-medium mb-2">Custom Message</label>
              <textarea
                rows={4}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Add rejection details"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          ) : null}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button onClick={onClose} disabled={submitting} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium text-gray-800 disabled:opacity-50">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={submitting}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg font-medium"
          >
            {submitting ? 'Rejecting…' : 'Reject Show'}
          </button>
        </div>
      </div>
    </div>
  )
}
