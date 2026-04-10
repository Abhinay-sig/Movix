import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { api } from '../lib/api'
import { getSeatSessionToken } from '../lib/seatSession'
import { downloadCalendarInvite } from '../lib/ticketCalendar'
import { downloadTicketPdf, isUpcomingTicket } from '../lib/ticketPdf'
import { useAuth } from '../useAuth'

const PAYMENT_METHODS = [
  {
    code: 'upi',
    label: 'UPI',
    helper: 'Pay with UPI apps or VPA',
    badge: 'Instant',
    accent: 'from-sky-600 via-blue-500 to-cyan-400',
  },
  {
    code: 'card',
    label: 'Cards',
    helper: 'Visa, Mastercard, RuPay',
    badge: '3DS',
    accent: 'from-slate-950 via-slate-700 to-slate-500',
  },
  {
    code: 'wallet',
    label: 'Wallets',
    helper: 'Phone wallets and balance',
    badge: 'Fast',
    accent: 'from-fuchsia-500 via-pink-500 to-orange-400',
  },
  {
    code: 'netbanking',
    label: 'Netbanking',
    helper: 'Major retail banks supported',
    badge: 'Bank OTP',
    accent: 'from-emerald-500 via-teal-500 to-cyan-500',
  },
]

const STEP_ITEMS = [
  { id: 1, label: 'Method' },
  { id: 2, label: 'Details' },
  { id: 3, label: 'OTP' },
  { id: 4, label: 'Review' },
]

function PaymentMethodIcon({ code, active }) {
  const tone = active ? 'text-white' : 'text-slate-700'

  if (code === 'upi') {
    return (
      <svg viewBox="0 0 32 32" className={`h-6 w-6 ${tone}`} fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M7 23V9l6 7 5-7v14" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M22 10l3 3-3 3" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M18 13h10" strokeLinecap="round" />
      </svg>
    )
  }

  if (code === 'card') {
    return (
      <svg viewBox="0 0 32 32" className={`h-6 w-6 ${tone}`} fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="4" y="7" width="24" height="18" rx="4" />
        <path d="M4 13h24" />
        <path d="M9 20h5" strokeLinecap="round" />
        <path d="M18 20h4" strokeLinecap="round" />
      </svg>
    )
  }

  if (code === 'wallet') {
    return (
      <svg viewBox="0 0 32 32" className={`h-6 w-6 ${tone}`} fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M6 11a3 3 0 0 1 3-3h12l5 4v10a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3V11Z" strokeLinejoin="round" />
        <path d="M21 17h7v5h-7a2.5 2.5 0 1 1 0-5Z" strokeLinejoin="round" />
        <circle cx="23.5" cy="19.5" r="1" fill="currentColor" stroke="none" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 32 32" className={`h-6 w-6 ${tone}`} fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 24h20" strokeLinecap="round" />
      <path d="M8 24V13l8-5 8 5v11" strokeLinejoin="round" />
      <path d="M12 17h8" strokeLinecap="round" />
      <path d="M16 17v7" strokeLinecap="round" />
    </svg>
  )
}

function msLeft(expiresAt) {
  const timestamp = new Date(expiresAt).getTime()
  return Math.max(0, timestamp - Date.now())
}

function formatShowDate(value) {
  if (!value) return 'TBA'
  return new Date(value).toLocaleString([], {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatCurrency(value) {
  return `₹${Number(value || 0)}`
}

function digitsOnly(value) {
  return String(value || '').replace(/\D/g, '')
}

function formatCardNumber(value) {
  return digitsOnly(value)
    .slice(0, 16)
    .replace(/(.{4})/g, '$1 ')
    .trim()
}

function formatExpiry(value) {
  const digits = digitsOnly(value).slice(0, 4)
  if (digits.length < 3) return digits
  return `${digits.slice(0, 2)}/${digits.slice(2)}`
}

function isValidExpiry(value) {
  if (!/^\d{2}\/\d{2}$/.test(value)) return false
  const [month, year] = value.split('/').map(Number)
  if (month < 1 || month > 12) return false

  const now = new Date()
  const fullYear = 2000 + year
  const expiry = new Date(fullYear, month, 0, 23, 59, 59, 999)
  return expiry >= now
}

function isValidUpiId(value) {
  return /^[a-zA-Z0-9._-]{2,}@[a-zA-Z][a-zA-Z0-9.-]{1,}$/.test(String(value || '').trim())
}

function isValidWalletPhone(value) {
  return /^[6-9]\d{9}$/.test(digitsOnly(value))
}

function getPaymentValidationError(method, values, accountEmail) {
  const email = String(values.paymentEmail || '').trim()
  if (!isEmailValid(email)) {
    return 'Enter a valid registered email address.'
  }

  if (accountEmail && email.toLowerCase() !== accountEmail.trim().toLowerCase()) {
    return 'Use your registered account email address for payment verification.'
  }

  if (method === 'upi') {
    if (!isValidUpiId(values.upiId)) {
      return 'Enter a valid UPI ID such as name@bank.'
    }
    return ''
  }

  if (method === 'card') {
    if (String(values.cardholderName || '').trim().length < 3) {
      return 'Enter the cardholder name exactly as shown on the card.'
    }
    if (digitsOnly(values.cardNumber).length !== 16) {
      return 'Enter a valid 16-digit card number.'
    }
    if (!isValidExpiry(values.expiry)) {
      return 'Enter a valid card expiry in MM/YY format.'
    }
    if (!/^\d{3,4}$/.test(digitsOnly(values.cvv))) {
      return 'Enter a valid 3 or 4 digit CVV.'
    }
    return ''
  }

  if (method === 'wallet') {
    if (!isValidWalletPhone(values.walletPhone)) {
      return 'Enter a valid 10-digit wallet mobile number.'
    }
    return ''
  }

  if (String(values.bankName || '').trim().length < 3) {
    return 'Select a valid bank for netbanking.'
  }

  return ''
}

function maskValue(value, visibleDigits = 4) {
  const cleaned = String(value || '').replace(/\s+/g, '')
  if (!cleaned) return 'Not entered'
  return `${'•'.repeat(Math.max(0, cleaned.length - visibleDigits))}${cleaned.slice(-visibleDigits)}`
}

function maskEmail(value) {
  const email = String(value || '').trim()
  const [localPart, domain] = email.split('@')
  if (!localPart || !domain) return 'Email unavailable'
  return `${localPart.slice(0, 2)}${'•'.repeat(Math.max(2, localPart.length - 2))}@${domain}`
}

function isEmailValid(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim())
}

function isStepAllowed(step, detailsReady, otpVerified) {
  if (step <= 2) return true
  if (step === 3) return detailsReady
  return detailsReady && otpVerified
}

function buildPaymentSummary(method, values) {
  if (method === 'upi') return values.upiId || 'UPI'
  if (method === 'card') return `Card ending ${maskValue(values.cardNumber)}`
  if (method === 'wallet') return `Wallet ${maskValue(values.walletPhone)}`
  return values.bankName || 'Selected bank'
}

export default function Payment() {
  const { auth, logout } = useAuth()
  const { showId } = useParams()
  const location = useLocation()
  const nav = useNavigate()
  const seatSessionToken = useMemo(() => getSeatSessionToken(), [])

  const [estimate, setEstimate] = useState(location.state?.estimate || null)
  const [showSummary, setShowSummary] = useState(location.state?.showSummary || null)
  const [holdExpiresAt, setHoldExpiresAt] = useState(location.state?.expiresAt || null)
  const [paymentMethod, setPaymentMethod] = useState('upi')
  const [currentStep, setCurrentStep] = useState(1)
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)
  const [, setTick] = useState(0)
  const [booking, setBooking] = useState(null)
  const [successMessage, setSuccessMessage] = useState('')
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [otpSent, setOtpSent] = useState(false)
  const [otpBusy, setOtpBusy] = useState(false)
  const [otpVerified, setOtpVerified] = useState(false)
  const [otpCode, setOtpCode] = useState('')
  const [holdRefreshBusy, setHoldRefreshBusy] = useState(false)
  const [form, setForm] = useState({
    cardholderName: '',
    cardNumber: '',
    expiry: '',
    cvv: '',
    upiId: '',
    walletPhone: '',
    bankName: 'HDFC Bank',
    paymentEmail: auth.user?.email || '',
  })

  const seatCodes = useMemo(() => location.state?.seatCodes || [], [location.state])
  const displaySeatCodes = useMemo(
    () => location.state?.displaySeatCodes || [],
    [location.state]
  )
  const left = holdExpiresAt ? msLeft(holdExpiresAt) : 0
  const bookingRef = useRef(booking)
  const seatCodesRef = useRef(seatCodes)
  const tokenRef = useRef(auth.token)
  const showIdRef = useRef(showId)

  useEffect(() => {
    bookingRef.current = booking
  }, [booking])

  useEffect(() => {
    seatCodesRef.current = seatCodes
  }, [seatCodes])

  useEffect(() => {
    tokenRef.current = auth.token
  }, [auth.token])

  useEffect(() => {
    showIdRef.current = showId
  }, [showId])

  useEffect(() => {
    return () => {
      if (bookingRef.current || !seatCodesRef.current.length || !tokenRef.current) return

      api('/holds/release', {
        method: 'POST',
        token: tokenRef.current,
        keepalive: true,
        body: {
          showId: Number(showIdRef.current),
          seatCodes: seatCodesRef.current,
          sessionToken: seatSessionToken,
        },
      }).catch(() => {})
    }
  }, [seatSessionToken])

  useEffect(() => {
    if (!holdExpiresAt || booking) return undefined
    const id = window.setInterval(() => setTick((value) => value + 1), 1000)
    return () => window.clearInterval(id)
  }, [booking, holdExpiresAt])

  const handleAuthFailure = useCallback(() => {
    logout()
    nav('/login', {
      replace: true,
      state: { from: `/shows/${showId}/payment` },
    })
  }, [logout, nav, showId])

  useEffect(() => {
    if (!seatCodes.length) return

    api(`/public/shows/${showId}/estimate`, {
      method: 'POST',
      body: { seatCodes },
    })
      .then((response) => {
        setEstimate(response)
        if (!showSummary && response.showSummary) setShowSummary(response.showSummary)
      })
      .catch(() => {})
  }, [seatCodes, showId, showSummary])

  useEffect(() => {
    if (!seatCodes.length || booking) return undefined

    let alive = true

    async function refreshHold({ silent = false } = {}) {
      if (!silent && alive) setHoldRefreshBusy(true)

      try {
        const response = await api('/holds', {
          method: 'POST',
          token: auth.token,
          body: {
            showId: Number(showId),
            seatCodes,
            sessionToken: seatSessionToken,
          },
        })

        if (!alive) return
        if (response?.expiresAt) setHoldExpiresAt(response.expiresAt)
      } catch (e) {
        if (!alive) return

        if (e.status === 401) {
          handleAuthFailure()
          return
        }

        if (e.status === 409) {
          window.alert(e.message || 'Your seat lock expired. Please choose seats again.')
          nav(`/shows/${showId}/seats`, { replace: true })
          return
        }

        if (!silent) {
          setErr(e.message)
        }
      } finally {
        if (!silent && alive) setHoldRefreshBusy(false)
      }
    }

    refreshHold()
    const id = window.setInterval(() => {
      refreshHold({ silent: true })
    }, 45000)

    return () => {
      alive = false
      window.clearInterval(id)
    }
  }, [auth.token, booking, handleAuthFailure, nav, seatCodes, seatSessionToken, showId])

  useEffect(() => {
    if (!holdExpiresAt || booking) return
    if (otpBusy || loading || holdRefreshBusy) return
    if (left > 0) return

    window.alert('Your seat lock expired. Please choose seats again.')
    nav(`/shows/${showId}/seats`, { replace: true })
  }, [booking, holdExpiresAt, holdRefreshBusy, left, loading, nav, otpBusy, showId])

  useEffect(() => {
    if (!booking?.ticket) return

    const upcoming = isUpcomingTicket(booking.ticket)
    if (upcoming) {
      downloadTicketPdf(booking.ticket)
      downloadCalendarInvite(booking.ticket)
      setSuccessMessage('Payment successful. Your ticket PDF and calendar invite were prepared automatically.')
    } else {
      setSuccessMessage('Payment successful. This show has expired, so ticket downloads and calendar invite are unavailable.')
    }

    setShowSuccessModal(true)
  }, [booking])

  if (!seatCodes.length || !holdExpiresAt) {
    return (
      <div className="flex min-h-[calc(100vh-9rem)] items-center justify-center px-4">
        <div className="page-panel w-full max-w-md space-y-4 p-6">
          <div className="text-sm font-medium text-red-600">Missing seat selection.</div>
          <Link to="/" className="text-sm font-semibold text-slate-950 hover:text-blue-600">
            Go home
          </Link>
        </div>
      </div>
    )
  }

  const totalAmount = booking?.totalAmount ?? estimate?.total ?? 0
  const breakdown = estimate?.breakdown || []
  const selectedMethod = PAYMENT_METHODS.find((item) => item.code === paymentMethod) || PAYMENT_METHODS[0]
  const secs = Math.ceil(left / 1000)
  const accountEmail = auth.user?.email || ''
  const validationError = getPaymentValidationError(paymentMethod, form, accountEmail)
  const detailsReady = !validationError
  const canConfirm = detailsReady && otpVerified && !loading && secs > 0
  const canDownloadTicket = booking?.ticket ? isUpcomingTicket(booking.ticket) : false

  function updateForm(key, value) {
    let nextValue = value
    if (key === 'cardNumber') nextValue = formatCardNumber(value)
    if (key === 'expiry') nextValue = formatExpiry(value)
    if (key === 'cvv') nextValue = digitsOnly(value).slice(0, 4)
    if (key === 'walletPhone') nextValue = digitsOnly(value).slice(0, 10)
    if (key === 'paymentEmail') nextValue = String(value || '').trimStart()

    setForm((prev) => ({ ...prev, [key]: nextValue }))
    if (otpSent || otpVerified) {
      setOtpSent(false)
      setOtpVerified(false)
      setOtpCode('')
    }
  }

  function goToStep(step) {
    if (!isStepAllowed(step, detailsReady, otpVerified)) return
    setCurrentStep(step)
  }

  function handleMethodChange(methodCode) {
    setPaymentMethod(methodCode)
    setCurrentStep(1)
    setOtpSent(false)
    setOtpBusy(false)
    setOtpVerified(false)
    setOtpCode('')
  }

  function continueFromMethod() {
    setCurrentStep(2)
  }

  function continueFromDetails() {
    if (!detailsReady) {
      setErr(validationError || 'Complete the payment details before continuing to OTP verification.')
      return
    }
    setErr('')
    setCurrentStep(3)
  }

  async function sendOtp() {
    if (!detailsReady) {
      setErr(validationError || 'Enter valid payment details before requesting OTP.')
      return
    }

    setOtpBusy(true)
    setErr('')
    try {
      const response = await api('/payments/otp/send', {
        method: 'POST',
        token: auth.token,
        body: {
          showId: Number(showId),
          email: form.paymentEmail,
          seatCodes,
          sessionToken: seatSessionToken,
        },
      })
      if (response?.expiresAt) setHoldExpiresAt(response.expiresAt)
      setOtpSent(true)
    } catch (e) {
      if (e.status === 401) {
        handleAuthFailure()
        return
      }
      if (e.status === 409) {
        setHoldExpiresAt(location.state?.expiresAt || null)
      }
      setErr(e.message)
    } finally {
      setOtpBusy(false)
    }
  }

  async function verifyOtp() {
    if (!/^\d{6}$/.test(String(otpCode).trim())) {
      setErr('Enter the 6-digit OTP sent to your email.')
      return
    }

    setOtpBusy(true)
    setErr('')
    try {
      const response = await api('/payments/otp/verify', {
        method: 'POST',
        token: auth.token,
        body: {
          showId: Number(showId),
          email: form.paymentEmail,
          seatCodes,
          otp: String(otpCode).trim(),
          sessionToken: seatSessionToken,
        },
      })
      if (response?.expiresAt) setHoldExpiresAt(response.expiresAt)
      setOtpVerified(true)
      setCurrentStep(4)
    } catch (e) {
      if (e.status === 401) {
        handleAuthFailure()
        return
      }
      if (e.status === 409) {
        setHoldExpiresAt(location.state?.expiresAt || null)
      }
      setErr(e.message)
    } finally {
      setOtpBusy(false)
    }
  }

  async function confirmPayment() {
    if (!detailsReady) {
      setErr(validationError || 'Complete the payment details before paying.')
      return
    }

    setErr('')
    setLoading(true)

    try {
      const response = await api('/bookings/confirm', {
        method: 'POST',
        token: auth.token,
        body: {
          showId: Number(showId),
          seatCodes,
          email: form.paymentEmail,
          sessionToken: seatSessionToken,
        },
      })

      setBooking({
        bookingId: response.bookingId,
        totalAmount: response.totalAmount,
        seatCodes,
        ticket: response.ticket || null,
      })
    } catch (e) {
      if (e.status === 401) {
        handleAuthFailure()
        return
      }
      setErr(e.message)
    } finally {
      setLoading(false)
    }
  }

  function renderMethodPanel() {
    return (
      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2">
          {PAYMENT_METHODS.map((method) => (
            <button
              key={method.code}
              type="button"
              onClick={() => handleMethodChange(method.code)}
              className={`rounded-[1.5rem] border px-4 py-4 text-left transition-all ${
                paymentMethod === method.code
                  ? 'border-blue-300 bg-blue-50 shadow-[0_12px_30px_rgba(59,130,246,0.12)]'
                  : 'border-slate-200 bg-white hover:-translate-y-0.5 hover:border-slate-300'
              }`}
            >
              <div className="mb-3 flex items-center justify-between">
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${method.accent} shadow-[0_10px_24px_rgba(15,23,42,0.16)]`}
                >
                  <PaymentMethodIcon code={method.code} active />
                </div>
                <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  {method.badge}
                </span>
              </div>
              <div className="text-sm font-semibold text-slate-950">{method.label}</div>
              <div className="mt-1 text-xs text-slate-500">{method.helper}</div>
            </button>
          ))}
        </div>

        <div className="rounded-[1.75rem] border border-slate-200 bg-white/90 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Gateway routing</div>
              <div className="mt-2 text-lg font-semibold text-slate-950">Movix Pay Secure</div>
            </div>
            <div className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">
              PCI Demo
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Selected method</div>
              <div className="mt-2 text-sm font-semibold text-slate-900">{selectedMethod.label}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Checkout amount</div>
              <div className="mt-2 text-sm font-semibold text-slate-900">{formatCurrency(totalAmount)}</div>
            </div>
          </div>
        </div>

        <button type="button" onClick={continueFromMethod} className="primary-button w-full">
          Continue to payer details
        </button>
      </div>
    )
  }

  function renderDetailsPanel() {
    return (
      <div className="space-y-5">
        <div className="rounded-[1.75rem] border border-slate-200 bg-white/90 p-5 shadow-sm">
          <div className="grid gap-4">
            <label className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Registered email</div>
              <input
                value={form.paymentEmail}
                onChange={(event) => updateForm('paymentEmail', event.target.value)}
                placeholder="Enter registered email"
                className="field-input"
              />
            </label>

            {paymentMethod === 'upi' ? (
              <label className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">UPI ID</div>
                <input
                  value={form.upiId}
                  onChange={(event) => updateForm('upiId', event.target.value)}
                  placeholder="name@bank"
                  className="field-input"
                />
              </label>
            ) : null}

            {paymentMethod === 'card' ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2 sm:col-span-2">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Cardholder name</div>
                  <input
                    value={form.cardholderName}
                    onChange={(event) => updateForm('cardholderName', event.target.value)}
                    placeholder="Name on card"
                    className="field-input"
                  />
                </label>
                <label className="space-y-2 sm:col-span-2">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Card number</div>
            <input
              value={form.cardNumber}
              onChange={(event) => updateForm('cardNumber', event.target.value)}
              placeholder="4111 1111 1111 1111"
              inputMode="numeric"
              maxLength={19}
              className="field-input"
            />
                </label>
                <label className="space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Expiry</div>
                  <input
                  value={form.expiry}
                  onChange={(event) => updateForm('expiry', event.target.value)}
                  placeholder="MM/YY"
                  inputMode="numeric"
                  maxLength={5}
                  className="field-input"
                />
                </label>
                <label className="space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">CVV</div>
                  <input
                  value={form.cvv}
                  onChange={(event) => updateForm('cvv', event.target.value)}
                  placeholder="123"
                  inputMode="numeric"
                  maxLength={4}
                  className="field-input"
                />
                </label>
              </div>
            ) : null}

            {paymentMethod === 'wallet' ? (
              <label className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Wallet mobile</div>
                <input
                  value={form.walletPhone}
                  onChange={(event) => updateForm('walletPhone', event.target.value)}
                  placeholder="Wallet linked mobile"
                  inputMode="numeric"
                  maxLength={10}
                  className="field-input"
                />
              </label>
            ) : null}

            {paymentMethod === 'netbanking' ? (
              <label className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Bank name</div>
                <select
                  value={form.bankName}
                  onChange={(event) => updateForm('bankName', event.target.value)}
                  className="field-input"
                >
                  <option>HDFC Bank</option>
                  <option>ICICI Bank</option>
                  <option>SBI</option>
                  <option>Axis Bank</option>
                </select>
              </label>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button type="button" onClick={() => setCurrentStep(1)} className="secondary-button w-full sm:w-auto">
            Back
          </button>
          <button type="button" onClick={continueFromDetails} className="primary-button w-full">
            Continue to OTP verification
          </button>
        </div>
      </div>
    )
  }

  function renderOtpPanel() {
    return (
      <div className="space-y-5">
        <div className="rounded-[1.75rem] border border-slate-200 bg-white/90 p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Email OTP verification</div>
              <div className="mt-2 text-lg font-semibold text-slate-950">Authenticate by registered email</div>
            </div>
            <div className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
              One OTP via email
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Delivery email</div>
              <div className="mt-2 text-sm font-semibold text-slate-900">{maskEmail(form.paymentEmail)}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Verification source</div>
              <div className="mt-2 text-sm font-semibold text-slate-900">{selectedMethod.label}</div>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={sendOtp} disabled={otpBusy} className="secondary-button w-full sm:w-auto">
              {otpBusy ? 'Sending...' : otpSent ? 'Send OTP again' : 'Send OTP'}
            </button>
            <input
              value={otpCode}
              onChange={(event) => setOtpCode(digitsOnly(event.target.value).slice(0, 6))}
              placeholder="Enter OTP from email"
              inputMode="numeric"
              maxLength={6}
              className="field-input"
            />
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button type="button" onClick={() => setCurrentStep(2)} className="secondary-button w-full sm:w-auto">
            Back
          </button>
          <button
            type="button"
            onClick={verifyOtp}
            disabled={!otpSent || otpBusy}
            className="primary-button w-full"
          >
            {otpBusy ? 'Verifying...' : otpVerified ? 'OTP verified' : 'Verify OTP'}
          </button>
        </div>
      </div>
    )
  }

  function renderReviewPanel() {
    return (
      <div className="space-y-5">
        <div className="rounded-[1.75rem] border border-slate-200 bg-white/90 p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Final confirmation</div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Method</div>
              <div className="mt-2 text-sm font-semibold text-slate-900">{selectedMethod.label}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Verified email</div>
              <div className="mt-2 text-sm font-semibold text-slate-900">{maskEmail(form.paymentEmail)}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 sm:col-span-2">
              <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Payment source</div>
              <div className="mt-2 text-sm font-semibold text-slate-900">
                {buildPaymentSummary(paymentMethod, form)}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button type="button" onClick={() => setCurrentStep(3)} className="secondary-button w-full sm:w-auto">
            Back
          </button>
          <button type="button" onClick={confirmPayment} disabled={!canConfirm} className="primary-button w-full">
            {loading ? 'Authorising payment...' : `Pay ${formatCurrency(totalAmount)}`}
          </button>
        </div>
      </div>
    )
  }

  if (booking) {
    return (
      <div className="mx-auto max-w-5xl space-y-8 px-4 py-10 md:px-6">
        {showSuccessModal ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-[2rem] border border-white/20 bg-white p-6 shadow-[0_28px_90px_rgba(15,23,42,0.35)]">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-xl font-bold text-emerald-700">
                M
              </div>
              <div className="mt-4 text-center">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">Payment successful</div>
                <div className="mt-2 text-2xl font-semibold text-slate-950">Booking confirmed</div>
                <p className="mt-3 text-sm leading-6 text-slate-500">{successMessage}</p>
              </div>
              <button type="button" onClick={() => setShowSuccessModal(false)} className="primary-button mt-6 w-full">
                Continue
              </button>
            </div>
          </div>
        ) : null}

        <section className="page-panel px-6 py-8 md:px-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <div className="hero-chip">Booking Confirmed</div>
              <h2 className="section-title max-w-3xl">Your ticket is ready</h2>
              <p className="section-copy max-w-2xl">
                Your payment has been authorised through Movix Pay Secure with OTP verification and a receipt-grade ticket layout.
              </p>
            </div>

            <div className="rounded-[1.75rem] border border-emerald-100 bg-emerald-50 px-5 py-4 shadow-sm">
              <div className="text-xs uppercase tracking-[0.18em] text-emerald-500">Booking ID</div>
              <div className="mt-2 text-2xl font-semibold text-emerald-950">#{booking.bookingId}</div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="page-panel px-6 py-7 md:px-8">
            <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Ticket details</div>
            <div className="mt-3 text-3xl font-semibold text-slate-950">{showSummary?.movieTitle || 'Movie experience'}</div>
            <div className="mt-2 text-sm text-slate-500">
              {showSummary?.theaterName || 'Theatre'} • {showSummary?.hallName || 'Hall'}
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white/85 px-4 py-4 shadow-sm">
                <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Showtime</div>
                <div className="mt-2 text-sm font-semibold text-slate-900">{formatShowDate(showSummary?.startsAt)}</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white/85 px-4 py-4 shadow-sm">
                <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Language</div>
                <div className="mt-2 text-sm font-semibold text-slate-900">{showSummary?.language || 'Standard'}</div>
              </div>
            </div>

            <div className="mt-6 rounded-[1.75rem] border border-slate-200 bg-white/90 p-5 shadow-sm">
              <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Seats on ticket</div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {breakdown.map((seat) => (
                  <div key={seat.seatCode} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                    <div className="text-lg font-semibold text-slate-950">{seat.seatCode}</div>
                    <div className="mt-1 text-sm text-slate-500">{seat.seatTypeLabel}</div>
                    <div className="mt-2 text-sm font-medium text-slate-700">{formatCurrency(seat.price)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-[linear-gradient(160deg,rgba(15,23,42,0.98),rgba(30,41,59,0.96),rgba(37,99,235,0.88))] p-6 text-white shadow-[0_28px_70px_rgba(15,23,42,0.22)]">
            <div className="text-xs uppercase tracking-[0.22em] text-blue-100/75">Movix Pay receipt</div>
            <div className="mt-3 text-3xl font-semibold">{formatCurrency(totalAmount)}</div>
            <div className="mt-1 text-sm text-blue-100/80">Authenticated with OTP and confirmed in-app</div>

            <div className="mt-6 space-y-4 border-t border-white/10 pt-5 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-blue-100/80">Method</span>
                <span className="font-medium">{selectedMethod.label}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-blue-100/80">Source</span>
                <span className="font-medium">{buildPaymentSummary(paymentMethod, form)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-blue-100/80">Status</span>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${
                    canDownloadTicket
                      ? 'bg-emerald-400/15 text-emerald-100'
                      : 'bg-amber-300/20 text-amber-100'
                  }`}
                >
                  {canDownloadTicket ? 'Upcoming' : 'Show Expired'}
                </span>
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-3">
              {canDownloadTicket ? (
                <>
                  <button type="button" onClick={() => downloadTicketPdf(booking.ticket)} className="primary-button">
                    Download ticket PDF
                  </button>
                  <button type="button" onClick={() => downloadCalendarInvite(booking.ticket)} className="secondary-button">
                    Add show to calendar
                  </button>
                </>
              ) : (
                <div className="rounded-2xl border border-amber-300/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
                  This show has already expired, so the ticket PDF and calendar invite are not available.
                </div>
              )}
              <Link to="/my-tickets" className="secondary-button">
                Open my tickets
              </Link>
              <Link to="/" className="secondary-button">
                Book another show
              </Link>
            </div>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-10 md:px-6">
      <section className="overflow-hidden rounded-[2.25rem] border border-blue-100 bg-[linear-gradient(135deg,#061733_0%,#0a2f67_34%,#1457b8_64%,#3b82f6_100%)] px-6 py-8 text-white shadow-[0_35px_100px_rgba(15,23,42,0.2)] md:px-10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-blue-50">
              Movix Pay Secure
            </div>
            <h2 className="max-w-3xl text-3xl font-semibold tracking-tight md:text-5xl">
              Finish your booking with a production-style OTP checkout
            </h2>
            <p className="max-w-2xl text-sm leading-6 text-blue-50/82 md:text-base">
              This payment gateway is styled from your Razorpay reference with a polished in-app flow: choose a method, enter your registered email, verify the OTP, and confirm your booking.
            </p>
          </div>

          <div className="rounded-[1.75rem] border border-white/15 bg-white/10 px-5 py-4 shadow-sm backdrop-blur-sm">
            <div className="text-xs uppercase tracking-[0.18em] text-blue-100/75">Seat hold expires in</div>
            <div className={`mt-2 text-3xl font-semibold ${secs <= 15 ? 'text-amber-200' : 'text-white'}`}>{secs}s</div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.16fr_0.84fr]">
        <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_28px_80px_rgba(15,23,42,0.1)]">
          <div className="border-b border-slate-200 bg-[linear-gradient(120deg,#08162f_0%,#0f3f8f_38%,#2563eb_74%,#7dd3fc_100%)] px-6 py-6 text-white md:px-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.24em] text-blue-100/85">Movix Pay secure checkout</div>
                <div className="mt-3 text-3xl font-semibold">{formatCurrency(totalAmount)}</div>
                <div className="mt-2 text-sm text-blue-100/85">{showSummary?.movieTitle || 'Your show booking'}</div>
              </div>

              <div className="rounded-[1.5rem] border border-white/15 bg-white/10 px-4 py-3 text-right backdrop-blur-sm">
                <div className="text-[11px] uppercase tracking-[0.2em] text-blue-100/70">Seats</div>
                <div className="mt-2 text-sm font-semibold text-white">
                  {(displaySeatCodes.length ? displaySeatCodes : breakdown.map((seat) => seat.seatCode)).join(', ')}
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-4">
              {STEP_ITEMS.map((step) => {
                const active = currentStep === step.id
                const completed = currentStep > step.id || (step.id === 3 && otpVerified)
                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => goToStep(step.id)}
                    disabled={!isStepAllowed(step.id, detailsReady, otpVerified)}
                    className={`rounded-[1.35rem] border px-4 py-3 text-left transition-all ${
                      active
                        ? 'border-white/30 bg-white/18'
                        : completed
                          ? 'border-emerald-200/30 bg-emerald-400/10'
                          : 'border-white/10 bg-white/8'
                    }`}
                  >
                    <div className="text-[11px] uppercase tracking-[0.2em] text-blue-100/75">Step {step.id}</div>
                    <div className="mt-2 text-sm font-semibold text-white">{step.label}</div>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="space-y-6 px-6 py-6 md:px-8">
            {currentStep === 1 ? renderMethodPanel() : null}
            {currentStep === 2 ? renderDetailsPanel() : null}
            {currentStep === 3 ? renderOtpPanel() : null}
            {currentStep === 4 ? renderReviewPanel() : null}

            {err ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 shadow-sm">
                {err}
              </div>
            ) : null}
          </div>
        </div>

        <div className="space-y-6">
          <section className="page-panel px-6 py-7">
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Order summary</div>
              <div className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-700">
                Email OTP required
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {breakdown.map((seat) => (
                <div key={seat.seatCode} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white/90 px-4 py-4 shadow-sm">
                  <div>
                    <div className="text-base font-semibold text-slate-950">{seat.seatCode}</div>
                    <div className="text-sm text-slate-500">{seat.seatTypeLabel}</div>
                  </div>
                  <div className="text-sm font-semibold text-slate-900">{formatCurrency(seat.price)}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-[linear-gradient(160deg,rgba(255,255,255,0.96),rgba(239,246,255,0.88),rgba(255,247,237,0.88))] px-6 py-7 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
            <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Live review</div>
            <div className="mt-5 space-y-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Movie</span>
                <span className="max-w-[60%] text-right font-medium text-slate-900">{showSummary?.movieTitle || 'Show'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Venue</span>
                <span className="max-w-[60%] text-right font-medium text-slate-900">{showSummary?.theaterName || 'Theatre'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Showtime</span>
                <span className="max-w-[60%] text-right font-medium text-slate-900">{formatShowDate(showSummary?.startsAt)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Method</span>
                <span className="font-medium text-slate-900">{selectedMethod.label}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Source</span>
                <span className="max-w-[60%] text-right font-medium text-slate-900">{buildPaymentSummary(paymentMethod, form)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Email OTP status</span>
                <span className={`font-medium ${otpVerified ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {otpVerified ? 'Verified' : otpSent ? 'Pending verification' : 'Not sent'}
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-slate-200 pt-4">
                <span className="text-slate-500">Total payable</span>
                <span className="text-xl font-semibold text-slate-950">{formatCurrency(totalAmount)}</span>
              </div>
            </div>

            <Link to={`/shows/${showId}/seats`} className="secondary-button mt-6 w-full">
              Back to seats
            </Link>
          </section>
        </div>
      </section>
    </div>
  )
}
