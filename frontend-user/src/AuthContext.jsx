import { useMemo, useState } from 'react'
import { AuthCtx } from './auth-context'
import { clearAuth, loadAuth, saveAuth } from './lib/auth'

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(() => loadAuth())

  const value = useMemo(() => {
    return {
      auth,
      setAuth: (next) => {
        setAuth(next)
        if (next) saveAuth(next)
        else clearAuth()
      },
      logout: () => {
        setAuth(null)
        clearAuth()
      },
    }
  }, [auth])

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>
}
