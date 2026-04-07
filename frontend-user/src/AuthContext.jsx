import { createContext, useContext, useMemo, useState } from 'react'
import { clearAuth, loadAuth, saveAuth } from './lib/auth'

const AuthCtx = createContext(null)

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
  const v = useContext(AuthCtx)
  if (!v) throw new Error('useAuth must be used within AuthProvider')
  return v
}

