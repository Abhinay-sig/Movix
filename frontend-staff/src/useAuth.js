import { useContext } from 'react'
import { AuthCtx } from './auth-context'

export function useAuth() {
  const value = useContext(AuthCtx)
  if (!value) throw new Error('useAuth must be used within AuthProvider')
  return value
}
