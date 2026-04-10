import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../useAuth'

export default function RequireRole({ role }) {
  const { auth } = useAuth()

  const hasToken = Boolean(auth?.token)
  const userRole = auth?.user?.role

  if (!hasToken) return <Navigate to="/login" replace />
  if (userRole !== role) return <Navigate to="/dashboard" replace />

  return <Outlet />
}
