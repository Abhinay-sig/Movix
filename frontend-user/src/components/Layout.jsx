import { Link, Outlet } from 'react-router-dom'
import { useAuth } from '../useAuth'

export default function Layout() {
  const { auth, logout } = useAuth()

  return (
    <div className="app-shell bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-50 border-b border-slate-200/90 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 md:px-6">
          <div className="flex items-center gap-8">
            <Link
              to="/"
              className="group flex items-center gap-3 transition-opacity duration-300 hover:opacity-85"
            >
              {/* <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-600 text-sm font-bold text-white">
                M
              </div> */}
              <img src="../../public/movix.svg" alt="" srcset="" className="h-10 w-10" />
              <span>
                <span className="block text-lg font-semibold tracking-[0.01em] text-slate-900 md:text-xl">
                  Movix
                </span>
                <span className="block text-xs tracking-[0.16em] text-slate-500 uppercase">
                  Movie tickets
                </span>
              </span>
            </Link>

            <nav className="hidden items-center gap-5 text-sm font-medium text-slate-600 md:flex">
              <Link to="/" className="transition-colors hover:text-blue-600">
                Home
              </Link>
              <Link to="/" className="transition-colors hover:text-blue-600">
                Movies
              </Link>
              {auth ? (
                <Link to="/my-tickets" className="transition-colors hover:text-blue-600">
                  My Tickets
                </Link>
              ) : null}
            </nav>
          </div>

          {auth ? (
            <div className="flex items-center gap-3">
              <div className="hidden text-right sm:block">
                <div className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Signed in</div>
                <div className="text-sm font-medium text-slate-900">{auth.user?.name}</div>
              </div>
              <button
                onClick={logout}
                className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
              >
                Logout
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
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
