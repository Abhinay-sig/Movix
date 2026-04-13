import { useEffect, useState } from 'react'

const reasonsList = [
  'Pricing issue',
  'Incorrect show timing',
  'Invalid movie details',
  'Hall not approved',
  'Duplicate entry',
  'Other',
]

export default function RejectModal({ open, onClose, onSubmit, entityType, submitting = false, error = '' }) {
  const [selectedReason, setSelectedReason] = useState('')
  const [customMessage, setCustomMessage] = useState('')

  useEffect(() => {
    if (!open) {
      setSelectedReason('')
      setCustomMessage('')
    }
  }, [open])

  if (!open) return null

  function submit(e) {
    e.preventDefault()
    if (submitting) return

    if (!selectedReason) {
      alert('Please select a reason')
      return
    }
    if (selectedReason === 'Other' && !customMessage.trim()) {
      alert('Please enter custom reason')
      return
    }

    const finalReason = selectedReason === 'Other' ? customMessage.trim() : selectedReason
    onSubmit?.(finalReason)
  }

  const label = entityType === 'hall' ? 'Hall' : 'Show'

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-xl bg-white rounded-xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-xl font-bold text-gray-900">Reject {label}</h3>
          <button type="button" onClick={onClose} className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 text-gray-800">
            Close
          </button>
        </div>

        <form onSubmit={submit} className="p-6 space-y-4">
          <div className="text-sm text-gray-600">Provide a reason for rejection.</div>

          {error ? <div className="text-red-600 bg-red-50 border border-red-200 p-3 rounded-lg">{error}</div> : null}

          <div>
            <label className="block text-gray-700 font-medium mb-2">Reason</label>
            <select
              value={selectedReason}
              onChange={(e) => setSelectedReason(e.target.value)}
              className="w-full border rounded p-2"
            >
              <option value="">Select reason</option>
              {reasonsList.map((reason, index) => (
                <option key={index} value={reason}>
                  {reason}
                </option>
              ))}
            </select>

            {selectedReason === 'Other' ? (
              <textarea
                placeholder="Add rejection details"
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                className="w-full border rounded p-2 mt-3"
                rows={4}
              />
            ) : null}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} disabled={submitting} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium text-gray-800 disabled:opacity-50">
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !selectedReason || (selectedReason === 'Other' && !customMessage.trim())}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg font-medium"
            >
              {submitting ? 'Rejecting…' : `Reject ${label}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
