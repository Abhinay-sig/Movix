import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import Login from './pages/Login'
import OwnerSignup from './pages/OwnerSignup'
import RequireRole from './components/RequireRole'
import OwnerTheaters from './pages/OwnerTheaters'
import OwnerTheaterHalls from './pages/OwnerTheaterHalls'
import OwnerMovies from './pages/OwnerMovies'
import OwnerNewHall from './pages/OwnerNewHall'
import OwnerNewShow from './pages/OwnerNewShow'
import OwnerRevenue from './pages/OwnerRevenue'
import AdminDashboard from './pages/AdminDashboard'
import AdminAddMovie from './pages/AdminAddMovie'
import AdminApprovals from './pages/AdminApprovals'
import AdminCaps from './pages/AdminCaps'
import AdminBlocking from './pages/AdminBlocking'

/* ✅ NEW IMPORT */
import AdminMovies from './pages/AdminMovies'

function Home() {
  return <div className="text-gray-600">Login to continue.</div>
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/owner/signup" element={<OwnerSignup />} />

        <Route element={<RequireRole role="theater_owner" />}>
          <Route path="/owner/theaters" element={<OwnerTheaters />} />
          <Route path="/owner/theatres/:theatreId/halls" element={<OwnerTheaterHalls />} />
          <Route path="/owner/movies" element={<OwnerMovies />} />
          <Route path="/owner/halls/new" element={<OwnerNewHall />} />
          <Route path="/owner/shows/new" element={<OwnerNewShow />} />
          <Route path="/owner/revenue" element={<OwnerRevenue />} />
        </Route>

        <Route element={<RequireRole role="admin" />}>
          <Route path="/admin/dashboard" element={<AdminDashboard />} />

          {/* ✅ NEW: Movie List Page */}
          <Route path="/admin/movies" element={<AdminMovies />} />

          {/* EXISTING */}
          <Route path="/admin/movies/new" element={<AdminAddMovie />} />

          {/* ✅ NEW: Edit Movie (reuse same form) */}
          <Route path="/admin/movies/:id/edit" element={<AdminAddMovie />} />

          <Route path="/admin/approvals" element={<AdminApprovals />} />
          <Route path="/admin/caps" element={<AdminCaps />} />
          <Route path="/admin/blocking" element={<AdminBlocking />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}