import { Link, Outlet } from 'react-router-dom'
import { useAuth } from '../useAuth'

export default function Layout() {
  const { auth, logout } = useAuth()

  return (
    <div className="staff-shell text-slate-900">
      <header className="sticky top-0 z-50 border-b border-fuchsia-100/70 bg-[linear-gradient(90deg,#0f172a_0%,#1e3a8a_25%,#7c3aed_58%,#ec4899_100%)] text-white shadow-[0_12px_30px_rgba(15,23,42,0.18)] backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4 py-4">
            <Link to="/dashboard" className="group flex items-center gap-3 transition-all duration-300 hover:opacity-90">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/20 bg-white/12 text-sm font-bold text-white shadow-sm backdrop-blur-sm">
                S
              </span>
              <span>
                <span className="block text-xl font-semibold tracking-tight text-white">MVP Staff</span>
                <span className="block text-xs text-pink-100/85">Owner and admin workspace</span>
              </span>
            </Link>

            <nav className="hidden flex-1 items-center justify-center gap-2 md:flex">
              {auth?.user?.role === 'theater_owner' ? (
                <>
                  <Link to="/owner/theaters" className="nav-link">Theaters</Link>
                  <Link to="/owner/movies" className="nav-link">Movies</Link>
                  <Link to="/owner/halls/new" className="nav-link">Add hall</Link>
                  <Link to="/owner/shows/new" className="nav-link">Schedule show</Link>
                  <Link to="/owner/revenue" className="nav-link">Revenue</Link>
                </>
              ) : null}

              {auth?.user?.role === 'admin' ? (
                <>
                  <Link to="/admin/dashboard" className="nav-link">Dashboard</Link>
                  <Link to="/admin/approvals" className="nav-link">Approvals</Link>
                  <Link to="/admin/movies" className="nav-link">Movies</Link>
                  <Link to="/admin/caps" className="nav-link">Pricing</Link>
                  <Link to="/admin/blocking" className="nav-link">Visibility</Link>
                  <Link to="/admin/reports" className="nav-link">Reports</Link>
                </>
              ) : null}
            </nav>

            <div className="flex items-center gap-3">
              {auth ? (
                <>
                  <div className="hidden rounded-full border border-white/16 bg-white/10 px-4 py-2 text-right leading-tight shadow-sm backdrop-blur-sm sm:block">
                    <div className="text-xs uppercase tracking-[0.18em] text-pink-100/70">Signed in</div>
                    <div className="mt-1 text-sm font-medium text-white">{auth.user?.name}</div>
                    <div className="text-xs capitalize text-pink-100/78">{auth.user?.role}</div>
                  </div>
                  <button
                    onClick={logout}
                    className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/10 px-6 py-3 text-sm font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/18"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center rounded-2xl bg-[linear-gradient(90deg,#ffffff,#fef3c7,#f5d0fe)] px-6 py-3 text-sm font-semibold text-slate-950 shadow-[0_12px_30px_rgba(255,255,255,0.18)] transition-all duration-300 hover:-translate-y-0.5 hover:brightness-105"
                >
                  Login
                </Link>
              )}
            </div>
          </div>

          <nav className="flex flex-wrap gap-2 pb-4 md:hidden">
            {auth?.user?.role === 'theater_owner' ? (
              <>
                <Link to="/owner/theaters" className="nav-chip">Theaters</Link>
                <Link to="/owner/movies" className="nav-chip">Movies</Link>
                <Link to="/owner/halls/new" className="nav-chip">Add hall</Link>
                <Link to="/owner/shows/new" className="nav-chip">Schedule show</Link>
                <Link to="/owner/revenue" className="nav-chip">Revenue</Link>
              </>
            ) : null}

            {auth?.user?.role === 'admin' ? (
              <>
                <Link to="/admin/dashboard" className="nav-chip">Dashboard</Link>
                <Link to="/admin/approvals" className="nav-chip">Approvals</Link>
                <Link to="/admin/movies" className="nav-chip">Movies</Link>
                <Link to="/admin/caps" className="nav-chip">Pricing</Link>
                <Link to="/admin/blocking" className="nav-chip">Visibility</Link>
                <Link to="/admin/reports" className="nav-chip">Reports</Link>
              </>
            ) : null}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
        <div className="staff-panel fade-up">
          <div className="p-4 sm:p-6 lg:p-8">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  )
}
