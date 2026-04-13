import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../useAuth'

const PLANS = {
  monthly: { code: 'monthly', label: 'Monthly', amountRs: 99 },
  yearly: { code: 'yearly', label: 'Yearly', amountRs: 999 },
}

export default function ProCheckout() {
  const { auth, setAuth, logout } = useAuth()
  const [params] = useSearchParams()
  const nav = useNavigate()
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [method, setMethod] = useState('upi')

  const selectedPlan = useMemo(() => {
    const code = String(params.get('plan') || 'monthly').toLowerCase()
    return PLANS[code] || PLANS.monthly
  }, [params])

  async function handlePay() {
    setErr('')
    setLoading(true)
    try {
      const response = await api('/pro/activate', {
        method: 'POST',
        token: auth.token,
        body: { plan: selectedPlan.code },
      })

      if (response?.user) {
        setAuth({ token: auth.token, user: response.user })
      }

      nav('/pro', {
        replace: true,
        state: { success: response?.message || 'Movix Pro activated successfully.' },
      })
    } catch (e) {
      if (e.status === 401) {
        logout()
        nav('/login', { replace: true, state: { from: '/pro' } })
        return
      }
      setErr(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 md:px-6">
      <section className="page-panel px-6 py-8 md:px-8">
        <div className="hero-chip">Movix Pro Checkout</div>
        <h2 className="section-title mt-3">Activate {selectedPlan.label} Pro</h2>
        <p className="section-copy mt-2">This is a dedicated Pro payment flow and does not affect your existing movie-payment module.</p>

        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-5">
          <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Plan amount</div>
          <div className="mt-2 text-3xl font-semibold text-slate-900">₹{selectedPlan.amountRs}</div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <button
            type="button"
            onClick={() => setMethod('upi')}
            className={`rounded-xl border px-4 py-3 text-sm font-medium ${
              method === 'upi' ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-600'
            }`}
          >
            UPI
          </button>
          <button
            type="button"
            onClick={() => setMethod('card')}
            className={`rounded-xl border px-4 py-3 text-sm font-medium ${
              method === 'card' ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-600'
            }`}
          >
            Card
          </button>
          <button
            type="button"
            onClick={() => setMethod('netbanking')}
            className={`rounded-xl border px-4 py-3 text-sm font-medium ${
              method === 'netbanking' ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-600'
            }`}
          >
            Netbanking
          </button>
        </div>

        {err ? (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{err}</div>
        ) : null}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link to="/pro" className="secondary-button w-full sm:w-auto">
            Cancel
          </Link>
          <button type="button" onClick={handlePay} disabled={loading} className="primary-button w-full">
            {loading ? 'Processing...' : `Pay ₹${selectedPlan.amountRs} and Activate`}
          </button>
        </div>
      </section>
    </div>
  )
}
