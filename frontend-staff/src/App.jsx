import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import Login from './pages/Login'
import OwnerSignup from './pages/OwnerSignup'
import RequireRole from './components/RequireRole'
import OwnerTheaters from './pages/OwnerTheaters'
import OwnerNewHall from './pages/OwnerNewHall'
import OwnerNewShow from './pages/OwnerNewShow'
import OwnerRevenue from './pages/OwnerRevenue'
import AdminDashboard from './pages/AdminDashboard'
import AdminApprovals from './pages/AdminApprovals'
import AdminCaps from './pages/AdminCaps'
import AdminBlocking from './pages/AdminBlocking'

function Home() {
  return (
    <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
      <section className="staff-card overflow-hidden px-6 py-8 md:px-8 md:py-10">
        <div className="space-y-5">
          <div className="staff-chip">Workspace</div>
          <div className="space-y-3">
            <h1 className="staff-title max-w-2xl">
              Manage theaters, halls, shows, and approvals in one polished hub.
            </h1>
            <p className="staff-copy max-w-2xl">
              Use the partner workspace to launch venues, shape show schedules,
              track performance, and deliver a polished guest experience.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 text-sm text-slate-500">
            <div className="rounded-full border border-slate-200 bg-white/90 px-4 py-2 shadow-sm">
              Owner tools
            </div>
            <div className="rounded-full border border-slate-200 bg-white/90 px-4 py-2 shadow-sm">
              Approval controls
            </div>
            <div className="rounded-full border border-slate-200 bg-white/90 px-4 py-2 shadow-sm">
              Revenue tracking
            </div>
          </div>
        </div>
      </section>

      <section className="staff-card overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-blue-600 p-6 text-white md:p-8">
        <div className="space-y-5">
          <div className="text-xs uppercase tracking-[0.22em] text-blue-100">
            Quick start
          </div>
          <div className="space-y-3">
            <div className="text-2xl font-semibold tracking-tight">
              Welcome to the partner workspace
            </div>
            <p className="text-sm leading-7 text-blue-50/82">
              Sign in to access the tools designed for cinema partners and the
              Movix experience team.
            </p>
          </div>

          <div className="space-y-3">
            {['Create and manage theaters', 'Submit halls and shows', 'Review system-wide changes'].map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-white/12 bg-white/10 px-4 py-3 backdrop-blur-sm"
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
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
          <Route path="/owner/halls/new" element={<OwnerNewHall />} />
          <Route path="/owner/shows/new" element={<OwnerNewShow />} />
          <Route path="/owner/revenue" element={<OwnerRevenue />} />
        </Route>

        <Route element={<RequireRole role="admin" />}>
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/approvals" element={<AdminApprovals />} />
          <Route path="/admin/caps" element={<AdminCaps />} />
          <Route path="/admin/blocking" element={<AdminBlocking />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
