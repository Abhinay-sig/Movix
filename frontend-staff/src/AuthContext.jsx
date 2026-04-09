import { useContext, useMemo, useState } from 'react'
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

export function useAuth() {
  const value = useContext(AuthCtx)
  if (!value) throw new Error('useAuth must be used within AuthProvider')
  return value
}
