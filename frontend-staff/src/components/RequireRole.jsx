// import { Navigate, Outlet } from 'react-router-dom'
// import { useAuth } from '../AuthContext'

// export default function RequireRole({ role }) {
//   const { auth } = useAuth()
//   if (!auth?.token) return <Navigate to="/login" replace />
//   if (auth.user?.role !== role) return <Navigate to="/" replace />
//   return <Outlet />
// }


import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../AuthContext'

export default function RequireRole({ role }) {
  const { auth } = useAuth()

  const hasToken = Boolean(auth?.token)
  const userRole = auth?.user?.role

  if (!hasToken) return <Navigate to="/login" replace />
  if (userRole !== role) return <Navigate to="/" replace />

  return <Outlet />
}