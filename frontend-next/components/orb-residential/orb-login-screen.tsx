'use client'

import { FormEvent, Suspense, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'

import { OrbAuthButton } from '@/components/orb-residential/ui/orb-auth-button'
import { OrbHeroSphere } from '@/components/orb-residential/ui/orb-hero-sphere'
import { useOrbResidentialThemeLock } from '@/components/orb-residential/use-orb-residential-theme-lock'
import { orbNavyGradient, orbNavyPage } from '@/components/orb-residential/ui/orb-theme'
import { useAuth } from '@/contexts/auth-context'
import {
  fetchOrbAccess,
  ORB_BILLING_API,
  orbOAuthStartUrl,
  trackOrbAnalytics
} from '@/lib/orb/orb-billing-client'
import { beginOrbPasskeyLogin, orbPasskeysSupported } from '@/lib/orb/orb-passkey-client'

const ORB_RETURN = '/orb'

function resolvePostLoginRoute(access: Awaited<ReturnType<typeof fetchOrbAccess>> | null) {
  if (!access) return ORB_RETURN
  if (!access.can_use_orb && !access.trial?.active && !access.subscription?.active) return '/orb/billing'
  return ORB_RETURN
}

function OrbLoginPanel() {
  useOrbResidentialThemeLock()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login, status, refreshSession } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [showEmailForm, setShowEmailForm] = useState(false)
  const [passkeyEmail, setPasskeyEmail] = useState('')
  const [passkeySupported, setPasskeySupported] = useState(false)

  const returnUrl = searchParams.get('returnUrl') || ORB_RETURN

  const [oauth, setOauth] = useState({
    google: process.env.NEXT_PUBLIC_OAUTH_GOOGLE_ENABLED === '1',
    microsoft: process.env.NEXT_PUBLIC_OAUTH_MICROSOFT_ENABLED === '1',
    apple: process.env.NEXT_PUBLIC_OAUTH_APPLE_ENABLED === '1'
  })

  useEffect(() => {
    setPasskeySupported(orbPasskeysSupported())
    trackOrbAnalytics('login_viewed')
    void fetch(ORB_BILLING_API.authProviders, { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => {
        const providers = (body as { data?: { oauth?: Record<string, boolean> } })?.data?.oauth
        if (!providers) return
        setOauth({
          google: Boolean(providers.google),
          microsoft: Boolean(providers.microsoft),
          apple: Boolean(providers.apple)
        })
      })
      .catch(() => {
        // Keep build-time flags
      })
    const oauthError = searchParams.get('oauth_error')
    if (oauthError) setError(oauthError)
    if (searchParams.get('provider') === 'email') setShowEmailForm(true)
  }, [searchParams])

  async function afterAuth() {
    await refreshSession()
    try {
      const access = await fetchOrbAccess()
      router.replace(resolvePostLoginRoute(access))
    } catch {
      router.replace(returnUrl.startsWith('/orb') ? returnUrl : ORB_RETURN)
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const response = await login({ email, password, remember })
      if (response.authenticated) {
        await afterAuth()
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

  async function handlePasskeySignIn() {
    const address = (passkeyEmail || email).trim()
    if (!address) {
      setError('Enter your email to use Face ID, Touch ID or a device passkey.')
      setShowEmailForm(true)
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const result = await beginOrbPasskeyLogin(address)
      if (result.authenticated) {
        await afterAuth()
        return
      }
      setError(result.message || 'Passkey sign-in could not be completed.')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Passkey sign-in failed')
    } finally {
      setSubmitting(false)
    }
  }

  const inputClass =
    'orb-login-input mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-white placeholder:text-slate-500'

  return (
    <div
      className={`orb-residential-root ${orbNavyPage} ${orbNavyGradient} h-[100dvh] overflow-hidden`}
      data-orb-login-page
      data-orb-residential="true"
    >
      <div className="mx-auto grid h-full max-w-6xl lg:grid-cols-2">
        <div className="hidden flex-col justify-center px-6 py-8 lg:flex lg:px-12">
          <Link href="/" className="text-sm font-semibold text-white">
            ORB Residential
          </Link>
          <p className="mt-1 text-xs text-sky-300/80">Powered by IndiCare Intelligence</p>
          <h1 className="mt-8 text-3xl font-semibold tracking-tight text-white" data-orb-login-title>
            The professional AI copilot for children&apos;s homes
          </h1>
          <div className="mt-8 flex justify-center lg:justify-start">
            <OrbHeroSphere className="scale-90" />
          </div>
        </div>

        <div className="flex min-h-0 flex-col justify-center overflow-y-auto border-t border-white/5 px-6 py-8 lg:border-l lg:border-t-0 lg:px-12">
          <Link href="/" className="text-sm font-semibold text-white lg:hidden">
            ORB Residential
          </Link>
          <h2 className="mt-6 text-xl font-semibold text-white lg:mt-0">Sign in</h2>
          {error ? <p className="mt-4 rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p> : null}

          <div className="mt-6 space-y-2" data-orb-oauth-buttons>
            <OrbAuthButton
              provider="microsoft"
              href={oauth.microsoft ? orbOAuthStartUrl('microsoft', ORB_RETURN) : undefined}
              disabled={!oauth.microsoft}
            >
              Continue with Microsoft
            </OrbAuthButton>
            <OrbAuthButton
              provider="google"
              href={oauth.google ? orbOAuthStartUrl('google', ORB_RETURN) : undefined}
              disabled={!oauth.google}
              data-orb-oauth-google
            >
              {oauth.google ? 'Continue with Google' : 'Google — not configured'}
            </OrbAuthButton>
            <OrbAuthButton
              provider="apple"
              href={oauth.apple ? orbOAuthStartUrl('apple', ORB_RETURN) : undefined}
              disabled={!oauth.apple}
              data-orb-oauth-apple
            >
              Continue with Apple
            </OrbAuthButton>
            <OrbAuthButton provider="email" type="button" onClick={() => setShowEmailForm((v) => !v)}>
              Continue with Email
            </OrbAuthButton>
            {passkeySupported ? (
              <>
                <OrbAuthButton
                  provider="passkey"
                  type="button"
                  disabled={submitting}
                  onClick={() => void handlePasskeySignIn()}
                  data-orb-passkey-sign-in
                >
                  Use Face ID, Touch ID or device passkey
                </OrbAuthButton>
                <label className="block text-xs text-slate-500">
                  Email for passkey
                  <input
                    type="email"
                    value={passkeyEmail}
                    onChange={(e) => setPasskeyEmail(e.target.value)}
                    placeholder="you@provider.co.uk"
                    className="orb-login-input mt-1 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white"
                    autoComplete="email webauthn"
                    data-orb-passkey-email
                  />
                </label>
              </>
            ) : (
              <p className="text-xs text-slate-500" data-orb-passkey-unavailable>
                Passkeys are not available on this device
              </p>
            )}
          </div>

          {showEmailForm ? (
            <form className="mt-6 space-y-4" onSubmit={handleSubmit} data-testid="orb-login-form">
              <label className="block text-sm font-medium text-slate-300">
                Email
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                  data-testid="orb-login-email"
                  autoComplete="email"
                />
              </label>
              <label className="block text-sm font-medium text-slate-300">
                Password
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputClass}
                  data-testid="orb-login-password"
                  autoComplete="current-password"
                />
              </label>
              <button
                type="submit"
                disabled={submitting || status === 'loading'}
                className="w-full rounded-2xl bg-gradient-to-r from-sky-400 to-blue-500 py-3 text-sm font-semibold text-slate-950 disabled:opacity-60"
                data-testid="orb-login-submit"
              >
                {submitting ? 'Signing in…' : 'Sign in with email'}
              </button>
              <p className="text-center text-xs text-slate-500">
                <Link href="/mfa" className="text-sky-400 hover:text-sky-300" data-orb-authenticator-fallback>
                  Use authenticator app instead
                </Link>
              </p>
            </form>
          ) : null}

          <p className="mt-6 text-sm text-slate-500">
            No account?{' '}
            <Link href="/orb/signup" className="font-semibold text-sky-400 hover:text-sky-300">
              Start free trial
            </Link>
          </p>
          <p className="mt-4 text-xs text-slate-600">
            <Link href="/" className="hover:text-slate-400">
              ← Back to home
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export function OrbLoginScreen() {
  return (
    <Suspense
      fallback={
        <div className={`${orbNavyPage} flex h-[100dvh] items-center justify-center overflow-hidden`}>Loading…</div>
      }
    >
      <OrbLoginPanel />
    </Suspense>
  )
}
