import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../useAuth'

export default function RequireAuth() {
  const { auth } = useAuth()
  const loc = useLocation()
  if (!auth?.token) return <Navigate to="/login" replace state={{ from: loc.pathname }} />
  return <Outlet />
}
