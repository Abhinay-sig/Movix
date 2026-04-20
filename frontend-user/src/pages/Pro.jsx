import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { api } from '../lib/api'
import { loadRazorpayCheckout, openRazorpayCheckout } from '../lib/razorpay'
import { useAuth } from '../useAuth'
import { Wallet, ArrowUpRight, ArrowDownLeft } from 'lucide-react'

function formatDate(value) {
  if (!value) return 'Not active'
  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatTxType(type) {
  if (type === 'cashback_credit') return 'Cashback credit'
  if (type === 'booking_debit') return 'Booking debit'
  return type
}

export default function Pro() {
  const { auth, setAuth, logout } = useAuth()
  const location = useLocation()
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [data, setData] = useState(null)
  const [activatingPlanCode, setActivatingPlanCode] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    loadRazorpayCheckout().catch(() => {})
  }, [])

  useEffect(() => {
    let alive = true
    setLoading(true)

    api(`/pro/me?page=${page}`, { token: auth.token })
      .then((response) => {
        if (!alive) return
        setData(response)
        setErr('')
        if (response?.user) {
          const prevUser = auth.user || {}
          const nextUser = response.user
          const changed =
            prevUser.isProActive !== nextUser.isProActive ||
            prevUser.proDaysLeft !== nextUser.proDaysLeft ||
            prevUser.proExpiresAt !== nextUser.proExpiresAt ||
            prevUser.movixCoinsBalance !== nextUser.movixCoinsBalance ||
            prevUser.movixCoinsEarnedTotal !== nextUser.movixCoinsEarnedTotal ||
            prevUser.movixCoinsRedeemedTotal !== nextUser.movixCoinsRedeemedTotal

          if (changed) {
            setAuth({ token: auth.token, user: response.user })
          }
        }
      })
      .catch((e) => {
        if (!alive) return
        if (e.status === 401) {
          logout()
          return
        }
        setErr(e.message)
      })
      .finally(() => {
        if (alive) setLoading(false)
      })

    return () => {
      alive = false
    }
  }, [
    auth.token,
    auth.user,
    page,
    setAuth,
    logout,
  ])

  const subscription = data?.subscription || { isProActive: false, proDaysLeft: 0 }
  const wallet = data?.wallet || { currentBalance: 0, totalEarned: 0, totalRedeemed: 0 }
  const plans = data?.plans || []
  const transactions = data?.transactions || { items: [], page: 1, totalPages: 1 }
  const showPlanHighlight = !subscription.isProActive || subscription.shouldHighlightExtend

  const statusLabel = useMemo(() => {
    if (!subscription.isProActive) return 'Not subscribed'
    return `${subscription.proDaysLeft} day(s) left`
  }, [subscription])

  async function handleActivate(planCode) {
    setErr('')
    setSuccessMessage('')
    setActivatingPlanCode(planCode)

    try {
      const trimmedEmail = String(auth.user?.email || '').trim()
      if (!trimmedEmail) {
        throw new Error('Your account email is missing. Please login again and retry.')
      }

      const orderResponse = await api('/pro/order/create', {
        method: 'POST',
        token: auth.token,
        body: {
          plan: planCode,
          email: trimmedEmail,
        },
      })

      const checkoutResult = await openRazorpayCheckout({
        key: orderResponse.checkout.key,
        amount: orderResponse.order.amount,
        currency: orderResponse.order.currency,
        name: orderResponse.checkout.name,
        description: orderResponse.checkout.description,
        order_id: orderResponse.order.id,
        prefill: {
          email: orderResponse.checkout.email || trimmedEmail,
        },
      })

      const verifyResponse = await api('/pro/order/verify', {
        method: 'POST',
        token: auth.token,
        body: {
          plan: planCode,
          email: trimmedEmail,
          razorpayOrderId: checkoutResult.razorpay_order_id,
          razorpayPaymentId: checkoutResult.razorpay_payment_id,
          razorpaySignature: checkoutResult.razorpay_signature,
        },
      })

      if (verifyResponse?.user) {
        setAuth({ token: auth.token, user: verifyResponse.user })
      }

      setSuccessMessage(verifyResponse?.message || 'Movix Pro activated successfully.')

      const refreshed = await api(`/pro/me?page=${page}`, { token: auth.token })
      setData(refreshed)
    } catch (e) {
      if (e.status === 401) {
        logout()
        return
      }
      if (String(e?.message || '').includes('Razorpay checkout was closed before payment completed')) {
        setErr('Payment was cancelled. You can try again anytime.')
      } else if (String(e?.message || '').includes('Razorpay checkout failed to load')) {
        setErr('Razorpay Checkout did not finish loading. Refresh the page and try again.')
      } else if (String(e?.message || '').includes('returned HTML instead of JSON')) {
        setErr('Movix could not reach the payment server. Make sure the backend is running and try again.')
      } else {
        setErr(e.message)
      }
    } finally {
      setActivatingPlanCode('')
    }
  }

  if (loading) {
    return <div className="py-10 text-center text-slate-500">Loading Movix Pro...</div>
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-5 md:px-6">
      <section className="page-panel px-6 py-8 md:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <div className="hero-chip">Movix Pro</div>
            <h2 className="section-title">Membership and MovixCoins</h2>
            <p className="section-copy">
              Get 10% cashback on bookings as MovixCoins. 1 MovixCoin = ₹1 on eligible bookings.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
            <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Current status</div>
            <div className="mt-1 font-semibold text-slate-900">{statusLabel}</div>
            <div className="text-xs text-slate-500">Valid till: {formatDate(subscription.proExpiresAt)}</div>
          </div>
        </div>
        {location.state?.success || successMessage ? (
          <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {successMessage || location.state.success}
          </div>
        ) : null}
        {err ? (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{err}</div>
        ) : null}
      </section>

      {!subscription.isProActive ? (
        <section className="page-panel px-6 py-7 md:px-8">
          <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Benefits</div>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            <li>10% cashback on every successful booking as MovixCoins.</li>
            <li>1 MovixCoin equals ₹1 discount on future bookings.</li>
            <li>Coins can be used directly during seat checkout.</li>
          </ul>
        </section>
      ) : null}

      {subscription.isProActive ? (
      <section className="grid gap-5 md:grid-cols-3">
        <div className="rounded-2xl border border-blue-100 bg-blue-50 px-5 py-5">
          <div className="flex items-center justify-between">
            <div className="text-xs uppercase tracking-[0.18em] text-blue-500">
              Wallet balance
            </div>
            <Wallet className="h-5 w-5 text-blue-500" />
          </div>
          <div className="mt-2 text-3xl font-semibold text-blue-950">{wallet.currentBalance}</div>
          <div className="text-sm text-blue-700">MovixCoins</div>
        </div>

        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-5 py-5">
          <div className="flex items-center justify-between">
            <div className="text-xs uppercase tracking-[0.18em] text-emerald-500">
              Total earned
            </div>
            <ArrowDownLeft className="h-5 w-5 text-emerald-500" />
          </div>
          <div className="mt-2 text-3xl font-semibold text-emerald-950">{wallet.totalEarned}</div>
          <div className="text-sm text-emerald-700">Cashback coins</div>
        </div>

        <div className="rounded-2xl border border-amber-100 bg-amber-50 px-5 py-5">
          <div className="flex items-center justify-between">
            <div className="text-xs uppercase tracking-[0.18em] text-amber-500">
              Total redeemed
            </div>
            <ArrowUpRight className="h-5 w-5 text-amber-500" />
          </div>
          <div className="mt-2 text-3xl font-semibold text-amber-950">{wallet.totalRedeemed}</div>
          <div className="text-sm text-amber-700">Spent on bookings</div>
        </div>
      </section>
      ) : null}

      {subscription.isProActive ? (
        <section className="page-panel px-6 py-7 md:px-8">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-slate-900">Recent MovixCoin transactions</h3>
            <div className="text-xs text-slate-500">10 per page</div>
          </div>

          {transactions.items?.length ? (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-[0.14em] text-slate-500">
                    <th className="px-3 py-2">Type</th>
                    <th className="px-3 py-2">Coins</th>
                    <th className="px-3 py-2">Note</th>
                    <th className="px-3 py-2">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.items.map((item) => (
                    <tr key={item.id} className="border-b border-slate-100">
                      <td className="px-3 py-3 font-medium text-slate-800">{formatTxType(item.type)}</td>
                      <td className={`px-3 py-3 font-semibold ${item.coins >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {item.coins >= 0 ? `+${item.coins}` : item.coins}
                      </td>
                      <td className="px-3 py-3 text-slate-600">{item.note || '-'}</td>
                      <td className="px-3 py-3 text-slate-500">{formatDate(item.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              No transactions yet.
            </div>
          )}

          <div className="mt-5 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              disabled={transactions.page <= 1}
              className="secondary-button disabled:opacity-50"
            >
              Previous
            </button>
            <div className="text-sm text-slate-600">
              Page {transactions.page} of {transactions.totalPages}
            </div>
            <button
              type="button"
              onClick={() => setPage((value) => Math.min(transactions.totalPages || 1, value + 1))}
              disabled={transactions.page >= (transactions.totalPages || 1)}
              className="secondary-button disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </section>
      ) : null}

      <section className="grid gap-5 md:grid-cols-2">
        {plans.map((plan) => (
          <article
            key={plan.code}
            className={`rounded-2xl border px-5 py-6 ${
              showPlanHighlight ? 'border-blue-200 bg-blue-50/70' : 'border-slate-200 bg-white'
            }`}
          >
            <div className="text-xs uppercase tracking-[0.18em] text-slate-500">{plan.label} plan</div>
            <div className="mt-2 text-3xl font-semibold text-slate-900">₹{plan.amountRs}</div>
            <div className="mt-1 text-sm text-slate-500">Validity: {plan.durationDays} days</div>
            <button
              type="button"
              onClick={() => handleActivate(plan.code)}
              disabled={Boolean(activatingPlanCode)}
              className="primary-button mt-5 w-full disabled:opacity-60"
            >
              {activatingPlanCode === plan.code ? 'Processing...' : 'Activate now'}
            </button>
          </article>
        ))}
      </section>
    </div>
  )
}
