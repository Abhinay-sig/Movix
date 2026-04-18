import { Link, Outlet } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../useAuth'

export default function Layout() {
  const { auth, logout } = useAuth()
  const isProActive = Boolean(auth?.user?.isProActive)
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="app-shell bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-50 border-b border-slate-200/90 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 md:px-6">
          <div className="flex items-center gap-8">
            <Link
              to="/"
              className="group flex items-center gap-3 transition-opacity duration-300 hover:opacity-85"
            >
              <img src="../../public/movix.svg" alt=""  className="h-10 w-10" />
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
              <Link to="/" className="nav-link">
                Home
              </Link>
              {/* <Link to="/" className="transition-colors hover:text-blue-600">
                Movies
              </Link> */}
              {auth ? (
                <Link to="/my-tickets" className="nav-link">
                  My Tickets
                </Link>
              ) : null}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              className="inline-flex items-center justify-center rounded-md p-2 text-slate-700 md:hidden"
              aria-expanded={mobileOpen}
              aria-label="Toggle menu"
            >
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                {mobileOpen ? (
                  <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>

            {auth ? (
            <div className="flex items-center gap-3">
              <Link
                to="/pro"
                className={`inline-flex items-center justify-center rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] transition-colors ${
                  isProActive
                    ? 'border border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100'
                    : 'border border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100'
                }`}
              >
                Movix Pro
              </Link>
              <div className="hidden text-right sm:block">
                <div className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Signed in</div>
                <div className={`rounded-lg px-3 py-1.5 ${isProActive ? 'border border-amber-200 bg-amber-50' : ''}`}>
                  <div className="text-sm font-medium text-slate-900">{auth.user?.name}</div>
                  {/* {isProActive ? (
                    <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-600">Pro</div>
                  ) : null} */}
                </div>
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
        </div>
        {mobileOpen ? (
          <nav className="md:hidden px-4 pb-4">
            <div className="flex flex-col gap-2">
              <Link to="/" onClick={() => setMobileOpen(false)} className="nav-chip">Home</Link>
              {auth ? <Link to="/my-tickets" onClick={() => setMobileOpen(false)} className="nav-chip">My Tickets</Link> : null}
            </div>
          </nav>
        ) : null}
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-10">
        <Outlet />
      </main>
    </div>
  )
}
