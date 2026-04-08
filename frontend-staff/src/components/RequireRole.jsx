import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../AuthContext'

export default function RequireRole({ role }) {
  const { auth } = useAuth()
  if (!auth?.token) return <Navigate to="/login" replace />
  if (auth.user?.role !== role) return <Navigate to="/dashboard" replace />
  return <Outlet />
}
