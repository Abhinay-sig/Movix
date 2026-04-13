export default function Toast({ open, message }) {
  if (!open) return null

  return (
    <div className="pointer-events-none fixed inset-0 z-50 grid place-items-center px-4 py-6">
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 shadow-lg shadow-emerald-100">
        {message}
      </div>
    </div>
  )
}
