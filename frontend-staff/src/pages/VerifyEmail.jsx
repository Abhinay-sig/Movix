import { Link, useSearchParams } from 'react-router-dom'

export default function VerifyEmail() {
  const [params] = useSearchParams()
  const status = params.get('status')
  const isSuccess = status === 'success'

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4">
      <div className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="space-y-5">
          <div className="staff-chip mx-auto inline-flex">{isSuccess ? 'Verified' : 'Link expired'}</div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
            {isSuccess ? 'Partner email verified' : 'This verification link is no longer valid'}
          </h1>
          <p className="text-sm leading-7 text-slate-500">
            {isSuccess
              ? 'Your partner account is verified. You can sign in now and continue setting up theaters, halls, and shows.'
              : 'The link either expired after 2 minutes or was already used. Head back to owner signup or login to request a fresh verification email.'}
          </p>

          <div className="flex flex-wrap justify-center gap-3">
            <Link
              to="/login"
              className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-600"
            >
              Login
            </Link>
            {!isSuccess ? (
              <Link
                to="/owner/signup"
                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 px-5 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                Back to signup
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
