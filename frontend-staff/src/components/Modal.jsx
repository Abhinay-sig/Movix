import { createPortal } from 'react-dom'

export default function Modal({ open, title, onClose, children, footer }) {
  if (!open) return null

  return createPortal(
    (
    <div className="fixed inset-0 z-[100] bg-slate-950/45">
      <div className="fixed left-1/2 top-1/2 z-[101] w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <h3 className="text-xl font-semibold text-slate-900">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900"
            aria-label="Close dialog"
          >
            ×
          </button>
        </div>

        <div className="px-6 py-5">{children}</div>

        {footer ? (
          <div className="flex flex-wrap justify-end gap-3 border-t border-slate-200 px-6 py-5">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
    ),
    document.body
  )
}
