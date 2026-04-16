import { Link, useSearchParams } from 'react-router-dom'

export default function VerifyEmail() {
  const [params] = useSearchParams()
  const status = params.get('status')
  const isSuccess = status === 'success'

  return (
    <div className="flex min-h-[calc(100vh-9rem)] items-center justify-center px-4 py-8">
      <div className="page-panel w-full max-w-xl p-8 md:p-10">
        <div className="space-y-5 text-center">
          <div className="hero-chip mx-auto">{isSuccess ? 'Verified' : 'Link expired'}</div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
            {isSuccess ? 'Your email is verified' : 'This verification link is no longer valid'}
          </h1>
          <p className="section-copy">
            {isSuccess
              ? 'Your account is ready. You can sign in now and continue your booking.'
              : 'The link may have expired after 2 minutes or it was already used once. Go back to signup or login to request a fresh verification email.'}
          </p>

          <div className="flex flex-wrap justify-center gap-3">
            <Link to="/login" className="primary-button">
              Login
            </Link>
            {!isSuccess ? (
              <Link
                to="/signup"
                className="rounded-full border border-blue-600 bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 hover:border-blue-700"
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
