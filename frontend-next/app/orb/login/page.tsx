'use client'

import { FormEvent, Suspense, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Fingerprint, ShieldCheck } from 'lucide-react'

import { useAuth } from '@/contexts/auth-context'
import { orbOAuthStartUrl, trackOrbAnalytics } from '@/lib/orb/orb-billing-client'
import { beginOrbPasskeyLogin, orbPasskeysSupported } from '@/lib/orb/orb-passkey-client'

function OrbLoginPanel() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login, status } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [passkeySubmitting, setPasskeySubmitting] = useState(false)
  const [passkeysAvailable, setPasskeysAvailable] = useState(false)

  useEffect(() => {
    trackOrbAnalytics('login_viewed')
    const oauthError = searchParams.get('oauth_error')
    if (oauthError) setError(oauthError)
    setPasskeysAvailable(orbPasskeysSupported())
  }, [searchParams])

  const returnUrl = searchParams.get('returnUrl') || '/orb'

  const biometricLabel = useMemo(() => {
    if (typeof navigator !== 'undefined' && /iPhone|iPad|Macintosh/i.test(navigator.userAgent)) {
      return 'Sign in with Face ID / Touch ID'
    }
    return 'Sign in with passkey'
  }, [])

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

  async function handlePasskeyLogin() {
    setPasskeySubmitting(true)
    setError(null)
    try {
      const response = await beginOrbPasskeyLogin(email)
      if (response.authenticated || response.ok) {
        router.replace(returnUrl)
        return
      }
      setError(response.message || 'Passkey sign-in could not be completed')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Passkey sign-in failed')
    } finally {
      setPasskeySubmitting(false)
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
              autoComplete="email webauthn"
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
              autoComplete="current-password"
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

        {passkeysAvailable ? (
          <button
            type="button"
            onClick={handlePasskeyLogin}
            disabled={passkeySubmitting || !email.trim()}
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-sky-200 bg-sky-50 py-3 text-sm font-bold text-sky-800 transition hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-50"
            data-orb-passkey-login
          >
            <Fingerprint className="h-4 w-4" aria-hidden />
            {passkeySubmitting ? 'Checking passkey…' : biometricLabel}
          </button>
        ) : null}

        <div className="mt-6 space-y-2" data-orb-oauth-buttons>
          {oauth.google ? (
            <a
              href={orbOAuthStartUrl('google', returnUrl)}
              className="block w-full rounded-2xl border border-slate-200 py-3 text-center text-sm font-semibold"
              data-orb-oauth-google
            >
              Continue with Google
            </a>
          ) : (
            <p className="text-xs text-slate-500">Google sign-in not configured (OAUTH_GOOGLE_CLIENT_ID).</p>
          )}
          {oauth.microsoft ? (
            <a
              href={orbOAuthStartUrl('microsoft', returnUrl)}
              className="block w-full rounded-2xl border border-slate-200 py-3 text-center text-sm font-semibold"
              data-orb-oauth-microsoft
            >
              Continue with Microsoft
            </a>
          ) : null}
          {oauth.apple ? (
            <a
              href={orbOAuthStartUrl('apple', returnUrl)}
              className="block w-full rounded-2xl border border-slate-200 py-3 text-center text-sm font-semibold"
              data-orb-oauth-apple
            >
              Continue with Apple
            </a>
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
