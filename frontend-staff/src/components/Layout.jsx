import { Link, Outlet } from 'react-router-dom'
import { useAuth } from '../useAuth'

export default function Layout() {
  const { auth, logout } = useAuth()

  return (
    <div className="staff-shell text-slate-900">
      <header className="sticky top-0 z-50 px-3 pt-3 text-white">
        <div className="mx-auto max-w-7xl rounded-[1.75rem] border border-blue-300/70 bg-gradient-to-r from-blue-700 via-blue-600 to-sky-600 px-4 py-4 shadow-[0_18px_40px_rgba(37,99,235,0.22)] backdrop-blur sm:px-6 lg:px-8 lg:py-5">
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
            <Link
              to="/"
              className="group flex items-center gap-3.5 transition-opacity duration-300 hover:opacity-90"
            >
              {/* <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-600 text-sm font-bold text-white">
                M
              </div> */}
              <img src="../../public/movix.svg" alt="" className="h-10 w-10" />
              <span>
                <span className="block text-xl font-semibold tracking-[0.01em] text-white">
                  Movix {auth?.user?.role === 'theater_owner' ? 'Multiplex' : (auth?.user?.role === 'admin' ? 'Admin' : '')}
                </span>
                <span className="block text-xs uppercase tracking-[0.18em] text-white/90">
                  Theater workspace
                </span>
              </span>
            </Link>

            <nav className="hidden flex-1 items-center justify-center gap-3 xl:gap-4 md:flex">
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

            <div className="flex items-center gap-3 sm:gap-4">
              {auth ? (
                <>
                  <div className="hidden min-h-11 rounded-xl border border-blue-900/20 bg-blue-800 px-4 py-2.5 text-center leading-tight shadow-sm sm:flex sm:min-w-48 sm:flex-col sm:items-center sm:justify-center">
                    <div className="text-[10px] uppercase tracking-[0.22em] text-blue-100">
                      Signed in
                    </div>
                    <div className="mt-0.5 text-sm font-medium leading-4 text-white">
                      {auth.user?.name}
                    </div>
                    <div className="mt-1 text-xs capitalize text-blue-100">
                      {auth.user?.role}
                    </div>
                  </div>
                  <button
                    onClick={logout}
                    className="inline-flex min-h-11 items-center justify-center rounded-xl border border-blue-900/20 bg-blue-800 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-900"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <Link
                  to="/login"
                  className="inline-flex min-h-11 items-center justify-center rounded-xl border border-blue-900/20 bg-blue-800 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-900"
                >
                  Login
                </Link>
              )}
            </div>
          </div>

          <nav className="flex flex-wrap gap-3 pt-4 md:hidden">
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

      <main className="relative z-10 mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
        <div className="staff-panel fade-up border border-slate-200 bg-white shadow-[0_14px_36px_rgba(15,23,42,0.08)]">
          <div className="p-4 sm:p-6 lg:p-8">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  )
}
