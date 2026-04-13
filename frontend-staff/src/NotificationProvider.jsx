import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'

const NotificationCtx = createContext(null)

const TONE_BY_TYPE = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  error: 'border-rose-200 bg-rose-50 text-rose-900',
  warning: 'border-amber-200 bg-amber-50 text-amber-900',
  info: 'border-slate-200 bg-white text-slate-900',
}

export function NotificationProvider({ children }) {
  const nextIdRef = useRef(1)
  const [notifications, setNotifications] = useState([])

  const dismissNotification = useCallback((id) => {
    setNotifications((prev) => prev.filter((item) => item.id !== id))
  }, [])

  const showNotification = useCallback(
    ({ title, message, type = 'info', durationMs = 2800 }) => {
      const id = nextIdRef.current++
      setNotifications((prev) => [...prev, { id, title, message, type }])

      if (durationMs > 0) {
        window.setTimeout(() => {
          setNotifications((prev) => prev.filter((item) => item.id !== id))
        }, durationMs)
      }

      return id
    },
    []
  )

  const value = useMemo(
    () => ({ showNotification, dismissNotification }),
    [dismissNotification, showNotification]
  )

  return (
    <NotificationCtx.Provider value={value}>
      {children}

      <div className="pointer-events-none fixed right-4 top-4 z-[80] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-3">
        {notifications.map((item) => (
          <div
            key={item.id}
            className={`pointer-events-auto rounded-2xl border px-4 py-3 shadow-[0_18px_45px_rgba(15,23,42,0.12)] backdrop-blur-sm ${TONE_BY_TYPE[item.type] || TONE_BY_TYPE.info}`}
          >
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                {item.title ? <div className="text-sm font-semibold">{item.title}</div> : null}
                {item.message ? (
                  <div className={`text-sm ${item.title ? 'mt-1 opacity-85' : ''}`}>{item.message}</div>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => dismissNotification(item.id)}
                className="rounded-full px-2 py-1 text-xs font-semibold opacity-60 transition-opacity hover:opacity-100"
              >
                Close
              </button>
            </div>
          </div>
        ))}
      </div>
    </NotificationCtx.Provider>
  )
}

export function useNotification() {
  const value = useContext(NotificationCtx)
  if (!value) throw new Error('useNotification must be used within NotificationProvider')
  return value
}
