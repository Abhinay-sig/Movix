import { Link, Outlet } from 'react-router-dom'
import { useState, useRef } from 'react'
import { useAuth } from '../useAuth'
import { ChevronDown } from 'lucide-react'

function DropdownButton({ label, open, onToggle }) {
  return (
    <button type="button" onClick={onToggle} className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-slate-600 transition-all duration-200 hover:bg-slate-100 hover:text-slate-900 hover:shadow-sm">
      <span>{label}</span>
      <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : 'rotate-0'}`} />
    </button>
  )
}

function Menu({ children }) {
  return (
    <div className="absolute left-0 mt-2 w-48 rounded-lg border border-slate-200 bg-white shadow-lg p-2 z-50">
      {children}
    </div>
  )
}

function MenuItem({ to, onClick, children }) {
  return (
    <Link to={to} onClick={onClick} className="block rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
      {children}
    </Link>
  )
}

export default function Layout() {
  const { auth, logout } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [managementOpen, setManagementOpen] = useState(false)
  const [operationsOpen, setOperationsOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [manageShowOpen, setManageShowOpen] = useState(false)

  const mgTimer = useRef(null)
  const opTimer = useRef(null)
  const createTimer = useRef(null)
  const manageShowTimer = useRef(null)

  function withTimersClear(...refs) {
    for (const r of refs) if (r.current) { clearTimeout(r.current); r.current = null }
  }

  return (
    <div className="staff-shell text-slate-900">
      <header className="sticky top-0 z-50 border-b border-slate-200/90 bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4">
            <Link
              to="/"
              className="group flex items-center gap-3 transition-opacity duration-300 hover:opacity-85"
            >
              <img src="../../public/movix.svg" alt="" className="h-10 w-10" />
              <span>
                <span className="block text-xl font-semibold tracking-[0.01em] text-slate-900">
                  Movix {auth?.user?.role === 'theater_owner' ? 'Multiplex' : (auth?.user?.role === 'admin' ? 'Admin' : '')}
                </span>
                <span className="block text-xs uppercase tracking-[0.18em] text-slate-500">
                  Theater workspace
                </span>
              </span>
            </Link>

            <nav className="hidden flex-1 items-center justify-center gap-2 md:flex">
              {auth?.user?.role === 'theater_owner' ? (
                <>
                  <Link to="/owner/theaters" className="nav-link">Theaters</Link>
                  <Link to="/owner/halls/new" className="nav-link">Add hall</Link>
                  <div className="relative"
                    onMouseEnter={() => { withTimersClear(manageShowTimer); setManageShowOpen(true) }}
                    onMouseLeave={() => { manageShowTimer.current = setTimeout(() => setManageShowOpen(false), 200) }}
                  >
                    <DropdownButton label="Manage Show" open={manageShowOpen} onToggle={() => setManageShowOpen((v) => !v)} />
                    {manageShowOpen ? (
                      <Menu>
                        <MenuItem to="/owner/movies" onClick={() => setManageShowOpen(false)}>Movie Catalog</MenuItem>
                        <MenuItem to="/owner/shows/new" onClick={() => setManageShowOpen(false)}>Schedule show</MenuItem>
                      </Menu>
                    ) : null}
                  </div>
                  <Link to="/owner/revenue" className="nav-link">Revenue</Link>
                </>
              ) : null}

              {auth?.user?.role === 'admin' ? (
                <>
                  <Link to="/admin/dashboard" className="nav-link">Dashboard</Link>
                  <div className="relative"
                    onMouseEnter={() => { withTimersClear(mgTimer); setManagementOpen(true) }}
                    onMouseLeave={() => { mgTimer.current = setTimeout(() => setManagementOpen(false), 200) }}
                  >
                    <DropdownButton label="Management" open={managementOpen} onToggle={() => setManagementOpen((v) => !v)} />
                    {managementOpen ? (
                      <Menu>
                        <MenuItem to="/admin/movies" onClick={() => setManagementOpen(false)}>Movie Catalog</MenuItem>
                        <MenuItem to="/admin/caps" onClick={() => setManagementOpen(false)}>Pricing</MenuItem>
                        <MenuItem to="/admin/blocking" onClick={() => setManagementOpen(false)}>Visibility</MenuItem>
                      </Menu>
                    ) : null}
                  </div>

                  <div className="relative"
                    onMouseEnter={() => { withTimersClear(opTimer); setOperationsOpen(true) }}
                    onMouseLeave={() => { opTimer.current = setTimeout(() => setOperationsOpen(false), 200) }}
                  >
                    <DropdownButton label="Operations" open={operationsOpen} onToggle={() => setOperationsOpen((v) => !v)} />
                    {operationsOpen ? (
                      <Menu>
                        <MenuItem to="/admin/approvals" onClick={() => setOperationsOpen(false)}>Approvals</MenuItem>
                        <MenuItem to="/admin/reports" onClick={() => setOperationsOpen(false)}>Reports</MenuItem>
                      </Menu>
                    ) : null}
                  </div>
                </>
              ) : null}
            </nav>

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

          {mobileOpen ? (
            <nav className="flex flex-col gap-2 pt-4 md:hidden">
              {auth?.user?.role === 'theater_owner' ? (
                <>
                  <Link to="/owner/theaters" onClick={() => setMobileOpen(false)} className="nav-chip">Theaters</Link>
                  <Link to="/owner/movies" onClick={() => setMobileOpen(false)} className="nav-chip">Movie Catalog</Link>
                  <Link to="/owner/halls/new" onClick={() => setMobileOpen(false)} className="nav-chip">Add hall</Link>
                  <Link to="/owner/shows/new" onClick={() => setMobileOpen(false)} className="nav-chip">Schedule show</Link>
                  <Link to="/owner/revenue" onClick={() => setMobileOpen(false)} className="nav-chip">Revenue</Link>
                </>
              ) : null}

              {auth?.user?.role === 'admin' ? (
                <>
                  <Link to="/admin/dashboard" onClick={() => setMobileOpen(false)} className="nav-chip">Dashboard</Link>
                  <Link to="/admin/approvals" onClick={() => setMobileOpen(false)} className="nav-chip">Approvals</Link>
                  <Link to="/admin/movies" onClick={() => setMobileOpen(false)} className="nav-chip">Movie Catalog</Link>
                  <Link to="/admin/caps" onClick={() => setMobileOpen(false)} className="nav-chip">Pricing</Link>
                  <Link to="/admin/blocking" onClick={() => setMobileOpen(false)} className="nav-chip">Visibility</Link>
                  <Link to="/admin/reports" onClick={() => setMobileOpen(false)} className="nav-chip">Reports</Link>
                </>
              ) : null}
            </nav>
          ) : null}
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
