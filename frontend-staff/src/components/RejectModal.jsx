import { useEffect, useState } from 'react'

const REJECT_REASONS = [
  { value: 'pricing_issue', label: 'Pricing issue' },
  { value: 'incorrect_timing', label: 'Incorrect show timing' },
  { value: 'invalid_details', label: 'Invalid details' },
  { value: 'hall_not_approved', label: 'Hall not approved' },
  { value: 'duplicate', label: 'Duplicate entry' },
  { value: 'other', label: 'Other' },
]

export default function RejectModal({ open, entityLabel, itemTitle, submitting, error, onClose, onSubmit }) {
  const [reasonType, setReasonType] = useState('')
  const [message, setMessage] = useState('')
  const [suggestion, setSuggestion] = useState('')

  useEffect(() => {
    if (!open) return
    setReasonType('')
    setMessage('')
    setSuggestion('')
  }, [open])

  if (!open) return null

  function submit(e) {
    e.preventDefault()
    if (!reasonType || submitting) return
    onSubmit?.({
      reasonType,
      message: message.trim() || undefined,
      suggestion: suggestion.trim() || undefined,
    })
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-xl bg-white rounded-xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-xl font-bold text-gray-900">Reject {entityLabel}</h3>
          <button type="button" onClick={onClose} className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 text-gray-800">
            Close
          </button>
        </div>

        <form onSubmit={submit} className="p-6 space-y-4">
          <div className="text-sm text-gray-600">
            {itemTitle || `Provide reason for rejecting this ${entityLabel.toLowerCase()}.`}
          </div>

          {error ? <div className="text-red-600 bg-red-50 border border-red-200 p-3 rounded-lg">{error}</div> : null}

          <div>
            <label className="block text-gray-700 font-medium mb-2">Reason Type</label>
            <select
              value={reasonType}
              onChange={(e) => setReasonType(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select reason</option>
              {REJECT_REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-2">Message</label>
            <textarea
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write rejection feedback"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-2">Suggestion (Optional)</label>
            <input
              value={suggestion}
              onChange={(e) => setSuggestion(e.target.value)}
              placeholder="Add recommendation to fix and resubmit"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} disabled={submitting} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium text-gray-800 disabled:opacity-50">
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !reasonType}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg font-medium"
            >
              {submitting ? 'Rejecting…' : `Reject ${entityLabel}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
