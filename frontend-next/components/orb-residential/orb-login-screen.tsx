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
import { OrbLegalLinks } from '@/components/orb-residential/orb-legal-links'
import { beginOrbPasskeyLogin, orbPasskeysSupported } from '@/lib/orb/orb-passkey-client'
import { ORB_CANONICAL_FRONT_DOOR, sanitizeOrbReturnUrl } from '@/lib/orb/orb-front-door-routing'
import { OrbAuthLoadingScreen } from '@/components/orb-residential/orb-auth-loading-screen'

function formatOAuthError(raw: string): string {
  const decoded = decodeURIComponent(raw.replace(/\+/g, ' '))
  if (/invalid_oauth_state/i.test(decoded)) {
    return 'Sign-in expired or was interrupted. Start again from this page.'
  }
  if (/not enabled|not configured/i.test(decoded)) {
    return 'That sign-in method is not available right now. Try email or another option.'
  }
  return decoded.length > 160 ? `${decoded.slice(0, 157)}…` : decoded
}

const ORB_RETURN = ORB_CANONICAL_FRONT_DOOR

const OAUTH_UNAVAILABLE_COPY: Record<'google' | 'microsoft' | 'apple', string> = {
  google: 'Google sign-in unavailable',
  microsoft: 'Microsoft sign-in unavailable',
  apple: 'Apple sign-in unavailable'
}

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

function OrbLoginPanel({
  returnUrl: returnUrlProp,
  embedded = false,
  embeddedGateMode = false,
  sessionError = null,
  onLoginSuccess
}: {
  returnUrl?: string
  embedded?: boolean
  embeddedGateMode?: boolean
  sessionError?: string | null
  onLoginSuccess?: () => void
}) {
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
  const [passkeyExpanded, setPasskeyExpanded] = useState(false)
  const [compactViewport, setCompactViewport] = useState(false)

  const returnUrl = sanitizeOrbReturnUrl(returnUrlProp || searchParams.get('returnUrl') || ORB_RETURN)
  const autoRedirectAuthenticated = !embeddedGateMode

  const [oauth, setOauth] = useState({
    google: process.env.NEXT_PUBLIC_OAUTH_GOOGLE_ENABLED === '1',
    microsoft: process.env.NEXT_PUBLIC_OAUTH_MICROSOFT_ENABLED === '1',
    apple: process.env.NEXT_PUBLIC_OAUTH_APPLE_ENABLED === '1'
  })

  useEffect(() => {
    if (!autoRedirectAuthenticated) return
    if (status !== 'authenticated') return
    let cancelled = false
    void (async () => {
      try {
        const access = await fetchOrbAccess()
        if (cancelled) return
        const target = resolvePostLoginRoute(access)
        if (target === returnUrl || target === window.location.pathname) return
        router.replace(target)
      } catch {
        if (!cancelled) {
          const target = returnUrl.startsWith('/orb') ? returnUrl : ORB_RETURN
          if (target !== window.location.pathname) router.replace(target)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [autoRedirectAuthenticated, returnUrl, router, status])

  useEffect(() => {
    const updateCompact = () => {
      const height = window.innerHeight
      setCompactViewport(height < 720)
      if (height >= 720) setPasskeyExpanded(true)
    }
    updateCompact()
    window.addEventListener('resize', updateCompact)
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
    if (oauthError) setError(formatOAuthError(oauthError))
    if (searchParams.get('provider') === 'email') setEmailStepReady(true)
    if (sessionError) setError(sessionError)
    return () => window.removeEventListener('resize', updateCompact)
  }, [searchParams, sessionError])

  async function afterAuth() {
    await refreshSession()
    if (embeddedGateMode) {
      onLoginSuccess?.()
      return
    }
    try {
      const access = await fetchOrbAccess()
      const target = resolvePostLoginRoute(access)
      if (target !== window.location.pathname) router.replace(target)
    } catch {
      const target = returnUrl.startsWith('/orb') ? returnUrl : ORB_RETURN
      if (target !== window.location.pathname) router.replace(target)
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

  if (autoRedirectAuthenticated && status === 'authenticated') {
    return <OrbAuthLoadingScreen />
  }

  return (
    <div
      className={`orb-residential-root orb-login-root ${themeClass} min-h-[100dvh] min-h-[100svh]`}
      data-orb-login-page
      data-orb-login-mobile-single-column
      data-orb-residential="true"
      data-orb-theme={resolvedTheme}
      data-orb-appearance={appearanceMode}
      data-orb-appearance-mode={appearanceMode}
      data-orb-login-embedded={embedded ? 'true' : undefined}
      data-orb-login-embedded-gate-mode={embeddedGateMode ? 'true' : undefined}
      style={{
        ...getOrbThemeCssVariables(resolvedTheme),
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom, 0px))'
      }}
    >
      <div
        className="orb-login-shell mx-auto grid min-h-0 w-full max-w-[72rem] grid-cols-1 px-5 py-6 sm:px-8 lg:min-h-[100dvh] lg:grid-cols-2 lg:gap-12 lg:px-10 lg:py-0"
        data-orb-login-two-column
        data-orb-login-scrollable
      >
        <div
          className="orb-login-hero relative hidden flex-col justify-center lg:flex lg:px-4 xl:px-8"
          data-orb-login-hero-centered
        >
          <div className="orb-login-hero-glow pointer-events-none absolute inset-0" aria-hidden />
          <div className="relative flex flex-col justify-center">
            <Link href="/orb" className="orb-login-brand-link text-sm font-semibold" data-orb-login-brand>
              ORB Residential
            </Link>
            <p className="orb-login-tagline mt-1 text-xs">Powered by IndiCare Intelligence</p>
            <h1
              className="orb-login-headline mt-8 max-w-md text-3xl font-semibold tracking-tight xl:text-[2rem]"
              data-orb-login-title
            >
              AI support for residential children&apos;s homes
            </h1>
            <p className="orb-login-lead mt-4 max-w-md text-base leading-relaxed">
              Record better. Reflect faster. Respond safer.
            </p>
            <ul className="orb-login-trust mt-8 max-w-md space-y-2.5 text-sm" data-orb-login-trust-points>
              {TRUST_POINTS.map((point) => (
                <li key={point} className="flex items-center gap-2.5">
                  <span
                    className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--orb-res-primary,#1677ff)]"
                    aria-hidden
                  />
                  {point}
                </li>
              ))}
            </ul>
            <div className="orb-login-hero-sphere-wrap mt-10 flex justify-center lg:justify-start">
              <OrbHeroSphere className="scale-90 xl:scale-100" />
            </div>
          </div>
        </div>

        <div
          className="orb-login-panel flex min-h-0 flex-col justify-center lg:px-4 xl:px-8"
          data-orb-login-panel-centered
        >
          <div className="orb-login-card orb-login-panel-inner mx-auto w-full max-w-md rounded-[1.75rem] border border-[var(--orb-line)]/50 bg-[var(--orb-surface-elevated)]/80 p-6 shadow-xl shadow-black/10 backdrop-blur-sm sm:p-8">
            <div className="flex flex-col items-center text-center lg:hidden" data-orb-login-mobile-hero>
              <OrbHeroSphere className="mb-3 scale-[0.62] sm:scale-[0.7]" />
            </div>

            <Link href="/orb" className="orb-login-brand-link text-sm font-semibold lg:hidden" data-orb-login-brand>
              ORB Residential
            </Link>
            <p className="orb-login-tagline mt-1 text-xs lg:hidden">Powered by IndiCare Intelligence</p>

            <h2 className="orb-login-signin-title mt-4 text-2xl font-bold tracking-tight lg:mt-0">Sign in</h2>
            <p className="orb-login-lead mt-2 text-sm" data-orb-login-mobile-lead>
              <span className="hidden sm:inline">
                Choose how you want to sign in. Your organisation may require a work account.
              </span>
              <span className="sm:hidden">Sign in to ORB Residential with your work account or email.</span>
            </p>

            {error ? (
              <p className="orb-login-error mt-4 rounded-2xl px-4 py-3 text-sm" role="alert">
                {error}
              </p>
            ) : null}

            <section className="mt-6" aria-labelledby="orb-login-work-account">
              <h3
                id="orb-login-work-account"
                className="orb-login-section-title text-xs font-semibold uppercase tracking-wide"
              >
                1. Continue with work account
              </h3>
              <div className="mt-2.5 space-y-2.5" data-orb-oauth-buttons>
                <OrbAuthButton
                  provider="microsoft"
                  href={oauth.microsoft ? orbOAuthStartUrl('microsoft', returnUrl) : undefined}
                  disabled={!oauth.microsoft || authBusy}
                  unavailableLabel={OAUTH_UNAVAILABLE_COPY.microsoft}
                >
                  Continue with Microsoft
                </OrbAuthButton>
                <OrbAuthButton
                  provider="google"
                  href={oauth.google ? orbOAuthStartUrl('google', returnUrl) : undefined}
                  disabled={!oauth.google || authBusy}
                  unavailableLabel={OAUTH_UNAVAILABLE_COPY.google}
                >
                  Continue with Google
                </OrbAuthButton>
                <OrbAuthButton
                  provider="apple"
                  href={oauth.apple ? orbOAuthStartUrl('apple', returnUrl) : undefined}
                  disabled={!oauth.apple || authBusy}
                  unavailableLabel={OAUTH_UNAVAILABLE_COPY.apple}
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
                    className="orb-login-submit w-full rounded-2xl py-2.5 text-sm font-semibold disabled:opacity-60 sm:py-3"
                    data-orb-login-email-continue
                  >
                    Continue with email
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
              <section className="mt-6" aria-labelledby="orb-login-passkey" data-orb-login-passkey-section>
                <button
                  type="button"
                  className="orb-login-section-title flex w-full items-center justify-between text-left text-xs font-semibold uppercase tracking-wide"
                  id="orb-login-passkey"
                  onClick={() => setPasskeyExpanded((open) => !open)}
                  aria-expanded={passkeyExpanded || !compactViewport}
                  data-orb-passkey-toggle
                >
                  <span>3. Use passkey</span>
                  {compactViewport ? (
                    <span className="text-[10px] normal-case tracking-normal text-[var(--orb-muted)]">
                      {passkeyExpanded ? 'Hide' : 'Show'}
                    </span>
                  ) : null}
                </button>
                {passkeyExpanded || !compactViewport ? (
                  <>
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
                        {passkeySubmitting ? 'Checking passkey…' : 'Use passkey'}
                      </OrbAuthButton>
                    </div>
                  </>
                ) : null}
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

            <footer
              className="orb-login-footer mt-8 border-t border-[var(--orb-line)]/40 pt-6 text-[10px] leading-relaxed text-[var(--orb-muted)]"
              data-orb-login-safe-bottom
            >
              <p data-orb-login-disclaimer>
                ORB supports professional judgement and does not replace safeguarding procedures, managers, emergency
                services or legal advice.
              </p>
              <OrbLegalLinks
                className="mt-4 justify-start gap-4"
                linkClassName="orb-login-link font-semibold"
                testId="orb-login-legal-links"
              />
            </footer>
          </div>
        </div>
      </div>
    </div>
  )
}

export function OrbLoginScreen({
  returnUrl,
  embedded = false,
  embeddedGateMode = false,
  sessionError = null,
  onLoginSuccess
}: {
  returnUrl?: string
  embedded?: boolean
  embeddedGateMode?: boolean
  sessionError?: string | null
  onLoginSuccess?: () => void
} = {}) {
  return (
    <Suspense fallback={<OrbAuthLoadingScreen />}>
      <OrbLoginPanel
        returnUrl={returnUrl}
        embedded={embedded}
        embeddedGateMode={embeddedGateMode}
        sessionError={sessionError}
        onLoginSuccess={onLoginSuccess}
      />
    </Suspense>
  )
}
