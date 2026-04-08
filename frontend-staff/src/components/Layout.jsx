import { Link, Outlet } from 'react-router-dom'
import { useAuth } from '../AuthContext'

export default function Layout() {
  const { auth, logout } = useAuth()
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <Link to="/dashboard" className="text-2xl font-bold text-gray-900 hover:text-blue-600 transition-colors">
              MVP Staff
            </Link>
            <nav className="flex items-center gap-6">
              {auth?.user?.role === 'theater_owner' ? (
                <>
                  <Link to="/owner/theaters" className="text-gray-700 hover:text-blue-600 font-medium transition-colors">Theaters</Link>
                  <Link to="/owner/halls/new" className="text-gray-700 hover:text-blue-600 font-medium transition-colors">Add hall</Link>
                  <Link to="/owner/shows/new" className="text-gray-700 hover:text-blue-600 font-medium transition-colors">Add show</Link>
                  <Link to="/owner/revenue" className="text-gray-700 hover:text-blue-600 font-medium transition-colors">Revenue</Link>
                </>
              ) : null}
              {auth?.user?.role === 'admin' ? (
                <>
                  <Link to="/admin/dashboard" className="text-gray-700 hover:text-blue-600 font-medium transition-colors">Dashboard</Link>
                  <Link to="/admin/approvals" className="text-gray-700 hover:text-blue-600 font-medium transition-colors">Approvals</Link>
                  <Link to="/admin/caps" className="text-gray-700 hover:text-blue-600 font-medium transition-colors">Pricing</Link>
                  <Link to="/admin/blocking" className="text-gray-700 hover:text-blue-600 font-medium transition-colors">Visibility</Link>
                  <Link to="/admin/reports" className="text-gray-700 hover:text-blue-600 font-medium transition-colors">Reports</Link>
                </>
              ) : null}
            </nav>
            <div className="flex-1" />
            {auth ? (
              <div className="flex items-center gap-4">
                <div className="text-sm text-gray-600">
                  <span className="font-medium">{auth.user?.name}</span> <span className="text-gray-500">({auth.user?.role})</span>
                </div>
                <button onClick={logout} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded-lg transition-colors">
                  Logout
                </button>
              </div>
            ) : (
              <Link to="/login" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors">
                Login
              </Link>
            )}
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-6 py-8">
        <Outlet />
      </main>
    </div>
  )
}
