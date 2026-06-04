'use client'

import { FormEvent, Suspense, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'

import { OrbAuthButton } from '@/components/orb-residential/ui/orb-auth-button'
import { OrbHeroSphere } from '@/components/orb-residential/ui/orb-hero-sphere'
import { useOrbResidentialThemeSync } from '@/components/orb-residential/use-orb-residential-theme-sync'
import { useOrbAppearance } from '@/components/orb-standalone/use-orb-appearance'
import { getOrbThemeCssVariables } from '@/lib/orb/orb-theme'
import { useAuth } from '@/contexts/auth-context'
import {
  fetchOrbAccess,
  ORB_BILLING_API,
  orbOAuthStartUrl,
  trackOrbAnalytics
} from '@/lib/orb/orb-billing-client'
import { beginOrbPasskeyLogin, orbPasskeysSupported } from '@/lib/orb/orb-passkey-client'

const ORB_RETURN = '/orb'

const TRUST_POINTS = [
  'Human review required',
  'Data protection controls',
  'Provider AI settings',
  "Designed for children's homes"
] as const

function resolvePostLoginRoute(access: Awaited<ReturnType<typeof fetchOrbAccess>> | null) {
  if (!access) return ORB_RETURN
  if (!access.can_use_orb && !access.trial?.active && !access.subscription?.active) return '/orb/billing'
  return ORB_RETURN
}

function OrbLoginPanel() {
  const { resolvedTheme, appearanceMode } = useOrbAppearance()
  useOrbResidentialThemeSync()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login, status, refreshSession } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [passkeySubmitting, setPasskeySubmitting] = useState(false)
  const [emailStepReady, setEmailStepReady] = useState(false)
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
    if (searchParams.get('provider') === 'email') setEmailStepReady(true)
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

  function handleEmailContinue(event: FormEvent) {
    event.preventDefault()
    if (!email.trim()) {
      setError('Enter your email address to continue.')
      return
    }
    setError(null)
    setEmailStepReady(true)
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
      setError(response.message || 'We could not sign you in. Check your email and password.')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Sign-in failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handlePasskeySignIn() {
    const address = (passkeyEmail || email).trim()
    if (!address) {
      setError('Enter your email so we can find your saved passkey.')
      return
    }
    setPasskeySubmitting(true)
    setError(null)
    try {
      const result = await beginOrbPasskeyLogin(address)
      if (result.authenticated) {
        await afterAuth()
        return
      }
      setError(result.message || 'Passkey sign-in could not be completed.')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Passkey sign-in failed.')
    } finally {
      setPasskeySubmitting(false)
    }
  }

  const themeClass = useMemo(
    () => (resolvedTheme === 'light' ? 'orb-login-root--light' : 'orb-login-root--dark'),
    [resolvedTheme]
  )

  const authBusy = submitting || passkeySubmitting || status === 'loading'

  return (
    <div
      className={`orb-residential-root orb-login-root ${themeClass} min-h-[100dvh]`}
      data-orb-login-page
      data-orb-residential="true"
      data-orb-theme={resolvedTheme}
      data-orb-appearance={appearanceMode}
      data-orb-appearance-mode={appearanceMode}
      style={getOrbThemeCssVariables(resolvedTheme)}
    >
      <div className="orb-login-shell mx-auto flex min-h-[100dvh] max-w-lg flex-col px-6 py-8 sm:max-w-6xl sm:px-8 lg:grid lg:max-w-6xl lg:grid-cols-2 lg:gap-0">
        <div className="orb-login-hero hidden flex-col justify-center lg:flex lg:px-12">
          <Link href="/" className="orb-login-brand-link text-sm font-semibold" data-orb-login-brand>
            ORB Residential
          </Link>
          <p className="orb-login-tagline mt-1 text-xs">Powered by IndiCare Intelligence</p>
          <h1 className="orb-login-headline mt-8 text-3xl font-semibold tracking-tight" data-orb-login-title>
            AI support for residential children&apos;s homes
          </h1>
          <p className="orb-login-lead mt-4 text-base leading-relaxed">
            Record better. Reflect faster. Respond safer.
          </p>
          <p className="orb-login-muted mt-3 text-sm leading-relaxed">
            Built to support professional judgement, not replace it.
          </p>
          <ul className="orb-login-trust mt-8 space-y-2 text-sm" data-orb-login-trust-points>
            {TRUST_POINTS.map((point) => (
              <li key={point} className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--orb-res-primary,#1677ff)]" aria-hidden />
                {point}
              </li>
            ))}
          </ul>
          <div className="mt-10 flex justify-center lg:justify-start">
            <OrbHeroSphere className="scale-90" />
          </div>
        </div>

        <div className="orb-login-panel flex min-h-0 flex-1 flex-col justify-center lg:border-l lg:pl-12">
          <div className="orb-login-panel-inner mx-auto w-full max-w-md">
            <div className="flex flex-col items-center text-center lg:hidden">
              <OrbHeroSphere className="mb-4 scale-75" />
            </div>

            <Link href="/" className="orb-login-brand-link text-sm font-semibold lg:hidden" data-orb-login-brand>
              ORB Residential
            </Link>
            <p className="orb-login-tagline mt-1 text-xs lg:hidden">Powered by IndiCare Intelligence</p>

            <h2 className="orb-login-signin-title mt-6 text-2xl font-bold tracking-tight lg:mt-0">Sign in</h2>
            <p className="orb-login-lead mt-2 text-sm">
              Choose how you want to sign in. Your organisation may require a work account.
            </p>

            {error ? (
              <p className="orb-login-error mt-4 rounded-2xl px-4 py-3 text-sm" role="alert">
                {error}
              </p>
            ) : null}

            <section className="mt-6" aria-labelledby="orb-login-work-account">
              <h3 id="orb-login-work-account" className="orb-login-section-title text-xs font-semibold uppercase tracking-wide">
                1. Continue with work account
              </h3>
              <div className="mt-2.5 space-y-2.5" data-orb-oauth-buttons>
                <OrbAuthButton
                  provider="microsoft"
                  href={oauth.microsoft ? orbOAuthStartUrl('microsoft', ORB_RETURN) : undefined}
                  disabled={!oauth.microsoft || authBusy}
                >
                  Continue with Microsoft
                </OrbAuthButton>
                <OrbAuthButton
                  provider="google"
                  href={oauth.google ? orbOAuthStartUrl('google', ORB_RETURN) : undefined}
                  disabled={!oauth.google || authBusy}
                >
                  {oauth.google ? 'Continue with Google' : 'Google — not configured'}
                </OrbAuthButton>
                <OrbAuthButton
                  provider="apple"
                  href={oauth.apple ? orbOAuthStartUrl('apple', ORB_RETURN) : undefined}
                  disabled={!oauth.apple || authBusy}
                >
                  Continue with Apple
                </OrbAuthButton>
              </div>
            </section>

            <section className="mt-6" aria-labelledby="orb-login-email">
              <h3 id="orb-login-email" className="orb-login-section-title text-xs font-semibold uppercase tracking-wide">
                2. Continue with email
              </h3>
              <form className="mt-2.5 space-y-3" onSubmit={handleEmailContinue} data-testid="orb-login-email-step">
                <label className="orb-login-field-label block text-sm font-medium">
                  Email
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="orb-login-input mt-2 w-full rounded-2xl px-4 py-3"
                    data-testid="orb-login-email"
                    autoComplete="email"
                    disabled={authBusy}
                  />
                </label>
                {!emailStepReady ? (
                  <button
                    type="submit"
                    disabled={authBusy}
                    className="orb-login-submit w-full rounded-2xl py-3 text-sm font-semibold disabled:opacity-60"
                    data-orb-login-email-continue
                  >
                    Continue
                  </button>
                ) : null}
              </form>

              {emailStepReady ? (
                <form className="mt-3 space-y-4" onSubmit={handleSubmit} data-testid="orb-login-form">
                  <label className="orb-login-field-label block text-sm font-medium">
                    Password
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="orb-login-input mt-2 w-full rounded-2xl px-4 py-3"
                      data-testid="orb-login-password"
                      autoComplete="current-password"
                      disabled={authBusy}
                    />
                  </label>
                  <label className="flex items-center gap-2 text-xs text-[var(--orb-muted)]">
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                      className="rounded"
                    />
                    Keep me signed in on this device
                  </label>
                  <button
                    type="submit"
                    disabled={authBusy}
                    className="orb-login-submit w-full rounded-2xl py-3 text-sm font-semibold disabled:opacity-60"
                    data-testid="orb-login-submit"
                  >
                    {submitting ? 'Signing in…' : 'Sign in with email'}
                  </button>
                  <p className="text-center text-xs">
                    <Link href="/mfa" className="orb-login-link font-medium" data-orb-authenticator-fallback>
                      Use authenticator app instead
                    </Link>
                  </p>
                </form>
              ) : null}
            </section>

            {passkeySupported ? (
              <section className="mt-6" aria-labelledby="orb-login-passkey">
                <h3 id="orb-login-passkey" className="orb-login-section-title text-xs font-semibold uppercase tracking-wide">
                  3. Other secure options
                </h3>
                <p className="orb-login-muted mt-2 text-xs leading-relaxed">
                  Use passkey if you have already set one up (Face ID, Touch ID or device passkey).
                </p>
                <label className="orb-login-field-label mt-3 block text-xs">
                  Enter your email so we can find your saved passkey.
                  <input
                    type="email"
                    value={passkeyEmail || email}
                    onChange={(e) => setPasskeyEmail(e.target.value)}
                    placeholder="you@provider.co.uk"
                    className="orb-login-input mt-1 w-full rounded-xl px-3 py-2 text-sm"
                    autoComplete="email webauthn"
                    data-orb-passkey-email
                    disabled={authBusy}
                  />
                </label>
                <div className="mt-2.5">
                  <OrbAuthButton
                    provider="passkey"
                    type="button"
                    disabled={authBusy}
                    onClick={() => void handlePasskeySignIn()}
                    data-orb-passkey-sign-in
                  >
                    {passkeySubmitting ? 'Checking passkey…' : 'Use Face ID, Touch ID or device passkey'}
                  </OrbAuthButton>
                </div>
              </section>
            ) : (
              <p className="orb-login-muted mt-6 text-xs" data-orb-passkey-unavailable>
                Passkeys are not available on this device.
              </p>
            )}

            <div className="mt-8 space-y-2 text-sm" data-orb-login-account-links>
              <p>
                New to ORB?{' '}
                <Link href="/orb/signup" className="orb-login-link-trial font-semibold" data-orb-create-account>
                  Create account
                </Link>
              </p>
              <p className="orb-login-muted text-xs leading-relaxed">
                Already subscribed through your provider?{' '}
                <button
                  type="button"
                  className="orb-login-link font-semibold"
                  onClick={() => {
                    setEmailStepReady(true)
                    document.getElementById('orb-login-email')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
                  }}
                  data-orb-provider-email-hint
                >
                  Sign in with your work email
                </button>
              </p>
            </div>

            <p className="orb-login-back mt-4 text-xs">
              <Link href="/" className="orb-login-link-subtle">
                ← Back to home
              </Link>
            </p>

            <footer className="orb-login-footer mt-8 border-t border-[var(--orb-line)]/40 pt-6 text-[10px] leading-relaxed text-[var(--orb-muted)]">
              <p data-orb-login-disclaimer>
                ORB supports professional judgement and does not replace safeguarding procedures, managers,
                emergency services or legal advice.
              </p>
            </footer>
          </div>
        </div>
      </div>
    </div>
  )
}

export function OrbLoginScreen() {
  return (
    <Suspense
      fallback={
        <div className="orb-residential-root orb-login-root orb-login-root--dark flex min-h-[100dvh] items-center justify-center">
          Loading…
        </div>
      }
    >
      <OrbLoginPanel />
    </Suspense>
  )
}
