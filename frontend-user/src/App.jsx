import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import RequireAuth from './components/RequireAuth'
import Home from './pages/Home'
import Login from './pages/Login'
import Signup from './pages/Signup'
import MovieShows from './pages/MovieShows'
import SeatSelect from './pages/SeatSelect'
import Payment from './pages/Payment'
import MyTickets from './pages/MyTickets'
import VerifyEmail from './pages/VerifyEmail'
import OAuthCallback from './pages/OAuthCallback'
import ResetPassword from './pages/ResetPassword'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/oauth/callback" element={<OAuthCallback />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/movies/:movieId" element={<MovieShows />} />

        <Route element={<RequireAuth />}>
          <Route path="/shows/:showId/seats" element={<SeatSelect />} />
          <Route path="/shows/:showId/payment" element={<Payment />} />
          <Route path="/my-tickets" element={<MyTickets />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
