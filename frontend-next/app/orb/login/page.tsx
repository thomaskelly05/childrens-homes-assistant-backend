'use client'

import { FormEvent, Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ShieldCheck } from 'lucide-react'

import { useAuth } from '@/contexts/auth-context'
import { trackOrbAnalytics } from '@/lib/orb/orb-billing-client'

function OrbLoginPanel() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login, status } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    trackOrbAnalytics('login_viewed')
  }, [])

  const returnUrl = searchParams.get('returnUrl') || '/orb'

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const response = await login({ email, password, remember })
      if (response.authenticated) {
        router.replace(returnUrl)
        return
      }
      if (response.mfa_required) {
        router.replace(`/mfa?next=${encodeURIComponent(returnUrl)}`)
        return
      }
      setError(response.message || 'Sign-in could not be completed')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Sign-in failed')
    } finally {
      setSubmitting(false)
    }
  }

  const oauth = {
    google: process.env.NEXT_PUBLIC_OAUTH_GOOGLE_ENABLED === '1',
    microsoft: process.env.NEXT_PUBLIC_OAUTH_MICROSOFT_ENABLED === '1',
    apple: process.env.NEXT_PUBLIC_OAUTH_APPLE_ENABLED === '1'
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#F8FAFC,#EEF2FF)] px-6 py-10 text-slate-950">
      <div className="mx-auto max-w-lg rounded-[2rem] border border-white/80 bg-white/90 p-8 shadow-2xl">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-indigo-700">
          <ShieldCheck className="h-4 w-4" aria-hidden />
          ORB Residential
        </div>
        <h1 className="text-3xl font-black tracking-tight" data-orb-login-title>
          ORB Residential — Powered by IndiCare
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600" data-orb-login-tagline>
          For adults working in or around children&apos;s homes. Standalone ORB does not access IndiCare OS records.
        </p>

        {error ? <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

        <form className="mt-6 space-y-4" onSubmit={handleSubmit} data-testid="orb-login-form">
          <label className="block text-sm font-semibold">
            Email
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3"
              data-testid="orb-login-email"
            />
          </label>
          <label className="block text-sm font-semibold">
            Password
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3"
              data-testid="orb-login-password"
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
            Keep me signed in
          </label>
          <button
            type="submit"
            disabled={submitting || status === 'loading'}
            className="w-full rounded-2xl bg-slate-950 py-3 text-sm font-bold text-white disabled:opacity-60"
            data-testid="orb-login-submit"
          >
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div className="mt-6 space-y-2" data-orb-oauth-buttons>
          {oauth.google ? (
            <button type="button" className="w-full rounded-2xl border border-slate-200 py-3 text-sm font-semibold">
              Continue with Google
            </button>
          ) : (
            <p className="text-xs text-slate-500">Google sign-in not configured (OAUTH_GOOGLE_CLIENT_ID).</p>
          )}
          {oauth.microsoft ? (
            <button type="button" className="w-full rounded-2xl border border-slate-200 py-3 text-sm font-semibold">
              Continue with Microsoft
            </button>
          ) : null}
          {oauth.apple ? (
            <button type="button" className="w-full rounded-2xl border border-slate-200 py-3 text-sm font-semibold">
              Continue with Apple
            </button>
          ) : null}
        </div>

        <p className="mt-6 text-sm text-slate-600">
          No account?{' '}
          <Link href="/orb/signup" className="font-bold text-indigo-700">
            Create one
          </Link>
        </p>
      </div>
    </main>
  )
}

export default function OrbLoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading…</div>}>
      <OrbLoginPanel />
    </Suspense>
  )
}
