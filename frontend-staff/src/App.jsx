import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import Login from './pages/Login'
import OwnerSignup from './pages/OwnerSignup'
import RequireRole from './components/RequireRole'
import ProtectedRoute from './components/ProtectedRoute'
import OwnerTheaters from './pages/OwnerTheaters'
import OwnerNewHall from './pages/OwnerNewHall'
import OwnerNewShow from './pages/OwnerNewShow'
import OwnerRevenue from './pages/OwnerRevenue'
import AdminDashboard from './pages/AdminDashboard'
import AdminApprovals from './pages/AdminApprovals'
import HallDetails from './pages/HallDetails'
import ShowDetails from './pages/ShowDetails'
import AdminCaps from './pages/AdminCaps'
import AdminBlocking from './pages/AdminBlocking'
import Reports from './pages/Reports'
import { useAuth } from './AuthContext'

function DashboardRedirect() {
  const { auth } = useAuth()
  if (!auth?.token) return <Navigate to="/login" replace />
  if (auth.user?.role === 'admin') return <Navigate to="/admin/dashboard" replace />
  if (auth.user?.role === 'theater_owner') return <Navigate to="/owner/theaters" replace />
  return <Navigate to="/login" replace />
}

function LoginRoute() {
  const { auth } = useAuth()
  if (auth?.token) return <Navigate to="/dashboard" replace />
  return <Login />
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<DashboardRedirect />} />
        <Route path="/dashboard" element={<DashboardRedirect />} />
        <Route path="/login" element={<LoginRoute />} />
        <Route path="/owner/signup" element={<OwnerSignup />} />

        <Route element={<ProtectedRoute><RequireRole role="theater_owner" /></ProtectedRoute>}>
          <Route path="/owner/theaters" element={<OwnerTheaters />} />
          <Route path="/owner/halls/new" element={<OwnerNewHall />} />
          <Route path="/owner/shows/new" element={<OwnerNewShow />} />
          <Route path="/owner/revenue" element={<OwnerRevenue />} />
        </Route>

        <Route element={<ProtectedRoute><RequireRole role="admin" /></ProtectedRoute>}>
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/approvals" element={<AdminApprovals />} />
          <Route path="/admin/approvals/:id" element={<HallDetails />} />
          <Route path="/admin/shows/:id" element={<ShowDetails />} />
          <Route path="/admin/caps" element={<AdminCaps />} />
          <Route path="/admin/blocking" element={<AdminBlocking />} />
          <Route path="/admin/reports" element={<Reports />} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  )
}
