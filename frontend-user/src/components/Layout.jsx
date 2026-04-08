// import { Link, Outlet } from 'react-router-dom'
// import { useAuth } from '../AuthContext'

// export default function Layout() {
//   const { auth, logout } = useAuth()
//   return (
//     <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
//       <header className="bg-white shadow-sm border-b border-gray-200">
//         <div className="max-w-7xl mx-auto px-6 py-4">
//           <div className="flex items-center justify-between gap-4">
//             <Link to="/" className="text-2xl font-bold text-gray-900 hover:text-blue-600 transition-colors">
//               MVP Movies
//             </Link>
//             {auth ? (
//               <div className="flex items-center gap-4">
//                 <div className="text-sm text-gray-600">
//                   <span className="font-medium">{auth.user?.name}</span>
//                 </div>
//                 <button onClick={logout} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded-lg transition-colors">
//                   Logout
//                 </button>
//               </div>
//             ) : (
//               <Link to="/login" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors">
//                 Login
//               </Link>
//             )}
//           </div>
//         </div>
//       </header>
//       <main className="max-w-7xl mx-auto px-6 py-8">
//         <Outlet />
//       </main>
//     </div>
//   )
// }

import { Link, Outlet } from 'react-router-dom'
import { useAuth } from '../AuthContext'

export default function Layout() {
  const { auth, logout } = useAuth()

  return (
    <div className="app-shell">
      <header className="sticky top-0 z-50 border-b border-fuchsia-100/70 bg-[linear-gradient(90deg,#0f172a_0%,#1e3a8a_28%,#7c3aed_62%,#ec4899_100%)] text-white shadow-[0_12px_30px_rgba(15,23,42,0.18)] backdrop-blur-xl">
        <div className="mx-auto max-w-6xl px-4 py-4 md:px-6">
          <div className="flex items-center justify-between gap-4">
            <Link
              to="/"
              className="group flex items-center gap-3 transition-all duration-300 hover:opacity-90"
            >
              <span className="pulse-ring flex h-10 w-10 items-center justify-center rounded-2xl border border-white/20 bg-white/12 text-sm font-bold text-white shadow-sm backdrop-blur-sm">
                M
              </span>
              <span>
                <span className="block text-lg font-semibold tracking-tight text-white md:text-xl">
                  MVP Movies
                </span>
                <span className="block text-xs text-pink-100/85">
                  Book your next cinema moment
                </span>
              </span>
            </Link>

            {auth ? (
              <div className="flex items-center gap-4">
                  <div className="hidden rounded-full border border-white/15 bg-white/10 px-4 py-2 text-right shadow-sm backdrop-blur-sm sm:block">
                  <div className="text-xs uppercase tracking-[0.2em] text-pink-100/70">
                    Signed in
                  </div>
                  <div className="text-sm font-medium text-white">
                    {auth.user?.name}
                  </div>
                </div>
                <button
                  onClick={logout}
                  className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/10 px-6 py-3 text-sm font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/18"
                >
                  Logout
                </button>
              </div>
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
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-10">
        <Outlet />
      </main>
    </div>
  )
}
