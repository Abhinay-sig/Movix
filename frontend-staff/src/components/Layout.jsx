import { Link, Outlet } from 'react-router-dom'
import { useAuth } from '../useAuth'

export default function Layout() {
  const { auth, logout } = useAuth()

  return (
    <div className="staff-shell text-slate-900">
      <header className="sticky top-0 z-50 border-b border-slate-200/90 bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4">
            <Link
              to="/"
              className="group flex items-center gap-3 transition-opacity duration-300 hover:opacity-85"
            >
              {/* <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-600 text-sm font-bold text-white">
                M
              </div> */}
              <img src="../../public/movix.svg" alt="" srcset="" className="h-10 w-10" />
              <span>
                <span className="block text-xl font-semibold tracking-[0.01em] text-slate-900">
                  Movix Staff
                </span>
                <span className="block text-xs uppercase tracking-[0.18em] text-slate-500">
                  Theater workspace
                </span>
              </span>
            </Link>

            <nav className="hidden flex-1 items-center justify-center gap-2 md:flex">
              {auth?.user?.role === 'theater_owner' ? (
                <>
                  <Link to="/owner/theaters" className="nav-link">
                    Theaters
                  </Link>
                  <Link to="/owner/movies" className="nav-link">
                    Movies
                  </Link>
                  <Link to="/owner/halls/new" className="nav-link">
                    Add hall
                  </Link>
                  <Link to="/owner/shows/new" className="nav-link">
                    Schedule show
                  </Link>
                  <Link to="/owner/revenue" className="nav-link">
                    Revenue
                  </Link>
                </>
              ) : null}

              {auth?.user?.role === 'admin' ? (
                <>
                  <Link to="/admin/dashboard" className="nav-link">
                    Dashboard
                  </Link>
                  <Link to="/admin/movies" className="nav-link">
                    Movies
                  </Link>
                  <Link to="/admin/approvals" className="nav-link">
                    Approvals
                  </Link>
                  <Link to="/admin/caps" className="nav-link">
                    Seat caps
                  </Link>
                  <Link to="/admin/blocking" className="nav-link">
                    Blocking
                  </Link>
                </>
              ) : null}
            </nav>

            <div className="flex items-center gap-3">
              {auth ? (
                <>
                  <div className="hidden text-right leading-tight sm:block">
                    <div className="text-[10px] uppercase tracking-[0.22em] text-slate-500">
                      Signed in
                    </div>
                    <div className="mt-1 text-sm font-medium text-slate-900">
                      {auth.user?.name}
                    </div>
                    <div className="text-xs capitalize text-slate-500">
                      {auth.user?.role}
                    </div>
                  </div>

                  <button
                    onClick={logout}
                    className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                >
                  Login
                </Link>
              )}
            </div>
          </div>

          <nav className="flex flex-wrap gap-2 pt-4 md:hidden">
            {auth?.user?.role === 'theater_owner' ? (
              <>
                <Link to="/owner/theaters" className="nav-chip">
                  Theaters
                </Link>
                <Link to="/owner/movies" className="nav-chip">
                  Movies
                </Link>
                <Link to="/owner/halls/new" className="nav-chip">
                  Add hall
                </Link>
                <Link to="/owner/shows/new" className="nav-chip">
                  Schedule show
                </Link>
                <Link to="/owner/revenue" className="nav-chip">
                  Revenue
                </Link>
              </>
            ) : null}

            {auth?.user?.role === 'admin' ? (
              <>
                <Link to="/admin/dashboard" className="nav-chip">
                  Dashboard
                </Link>
                <Link to="/admin/movies" className="nav-chip">
                  Movies
                </Link>
                <Link to="/admin/approvals" className="nav-chip">
                  Approvals
                </Link>
                <Link to="/admin/caps" className="nav-chip">
                  Seat caps
                </Link>
                <Link to="/admin/blocking" className="nav-chip">
                  Blocking
                </Link>
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
