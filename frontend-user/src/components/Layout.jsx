import { Link, Outlet } from 'react-router-dom'
import { useAuth } from '../useAuth'

export default function Layout() {
  const { auth, logout } = useAuth()
  const isProActive = Boolean(auth?.user?.isProActive)

  return (
    <div className="app-shell bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-50 border-b border-blue-300/70 bg-gradient-to-r from-blue-700 via-blue-600 to-sky-600 text-white shadow-[0_18px_40px_rgba(37,99,235,0.22)] backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-4 px-4 py-4 md:px-6 md:py-5">
          <div className="flex items-center gap-6 lg:gap-10">
            <Link
              to="/"
              className="group flex items-center gap-3.5 transition-opacity duration-300 hover:opacity-90"
            >
              {/* <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-600 text-sm font-bold text-white">
                M
              </div> */}
              <img src="../../public/movix.svg" alt=""  className="h-10 w-10" />
              <span>
                <span className="block text-lg font-semibold tracking-[0.01em] text-white md:text-xl">
                  Movix
                </span>
                <span className="block text-xs uppercase tracking-[0.16em] text-white/90">
                  Movie tickets
                </span>
              </span>
            </Link>

            <nav className="hidden items-center gap-3 text-sm font-medium text-blue-50 md:flex">
              <Link to="/" className="inline-flex min-h-11 items-center justify-center rounded-full border border-blue-900/20 bg-blue-800 px-4 py-2 text-white shadow-sm transition-colors hover:bg-blue-900">
                Home
              </Link>
              {/* <Link to="/" className="transition-colors hover:text-blue-600">
                Movies
              </Link> */}
              {auth ? (
                <Link to="/my-tickets" className="inline-flex min-h-11 items-center justify-center rounded-full border border-blue-900/20 bg-blue-800 px-4 py-2 text-white shadow-sm transition-colors hover:bg-blue-900">
                  My Tickets
                </Link>
              ) : null}
            </nav>
          </div>

          {auth ? (
            <div className="flex items-center gap-3 sm:gap-4">
              <Link
                to="/pro"
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-blue-900/20 bg-blue-800 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-white shadow-sm transition-colors hover:bg-blue-900"
              >
                Movix Pro
              </Link>
              <div className="hidden min-h-11 rounded-xl border border-blue-900/20 bg-blue-800 px-4 py-2.5 text-center shadow-sm sm:flex sm:min-w-44 sm:flex-col sm:items-center sm:justify-center">
                <div className="text-[10px] uppercase tracking-[0.22em] text-blue-100">Signed in</div>
                <div className={`mt-0.5 rounded-md ${isProActive ? 'text-white' : ''}`}>
                  <div className="text-sm font-medium leading-4 text-white">{auth.user?.name}</div>
                  {isProActive ? (
                    <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-100">Pro</div>
                  ) : null}
                </div>
              </div>
              <button
                onClick={logout}
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-blue-900/20 bg-blue-800 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-900"
              >
                Logout
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-blue-900/20 bg-blue-800 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-900"
            >
              Login
            </Link>
          )}
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-10">
        <Outlet />
      </main>
    </div>
  )
}
