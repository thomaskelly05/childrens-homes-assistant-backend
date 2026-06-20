'use client'

import { FormEvent, Suspense, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

import { OrbLoginAuthCard } from '@/components/orb-residential/orb-login-auth-card'
import { OrbLoginDesktopHero } from '@/components/orb-residential/orb-login-desktop-hero'
import { OrbLoginMobileHeader } from '@/components/orb-residential/orb-login-mobile-header'
import { useOrbResidentialThemeSync } from '@/components/orb-residential/use-orb-residential-theme-sync'
import { useOrbAppearance } from '@/components/orb-standalone/use-orb-appearance'
import { getOrbThemeCssVariables } from '@/lib/orb/orb-theme'
import { useAuth } from '@/contexts/auth-context'
import { normaliseRole } from '@/lib/auth/permissions'
import {
  fetchOrbAccess,
  ORB_BILLING_API,
  orbOAuthStartUrl,
  trackOrbAnalytics
} from '@/lib/orb/orb-billing-client'
import { beginOrbPasskeyLogin, orbPasskeysSupported } from '@/lib/orb/orb-passkey-client'
import { ORB_CANONICAL_FRONT_DOOR, sanitizeOrbReturnUrl } from '@/lib/orb/orb-front-door-routing'
import { recordOrbAuthRecoveryEvent, sessionAuthCookiePresent } from '@/lib/orb/orb-auth-recovery-diagnostics'
import { ORB_AUTH_BUILD_VARIANT, ORB_LOGIN_VERSION } from '@/lib/orb/orb-visual-build'
import { OrbAuthLoadingScreen } from '@/components/orb-residential/orb-auth-loading-screen'
import { ORB_MOBILE_VIEWPORT_CLASS } from '@/components/orb-residential/orb-mobile-shell'
import { ORB_DEFAULT_LEGAL_PATHS, type OrbLegalPaths } from '@/components/orb-residential/orb-legal-links'
import { consumeOrbOAuthRedirect } from '@/lib/orb/orb-oauth-redirect-state'

function formatOAuthError(raw: string): string {
  const decoded = decodeURIComponent(raw.replace(/\+/g, ' '))
  if (/invalid_oauth_state|security check failed/i.test(decoded)) {
    return 'Sign-in expired or was interrupted. Start again from this page.'
  }
  if (/already been used/i.test(decoded)) {
    return 'This sign-in link has already been used. Please sign in again.'
  }
  if (/not enabled|not configured/i.test(decoded)) {
    return 'That sign-in method is not available right now. Try email or another option.'
  }
  return decoded.length > 160 ? `${decoded.slice(0, 157)}…` : decoded
}

const ORB_RETURN = ORB_CANONICAL_FRONT_DOOR

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
  const { login, status, refreshSession, applySessionUser } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [passkeySubmitting, setPasskeySubmitting] = useState(false)
  const [passkeyEmail, setPasskeyEmail] = useState('')
  const [passkeySupported, setPasskeySupported] = useState(false)
  const [passkeyExpanded, setPasskeyExpanded] = useState(false)
  const [emailExpanded, setEmailExpanded] = useState(false)

  const returnUrl = sanitizeOrbReturnUrl(returnUrlProp || searchParams.get('returnUrl') || ORB_RETURN)
  const autoRedirectAuthenticated = !embeddedGateMode

  const [oauth, setOauth] = useState({
    google: process.env.NEXT_PUBLIC_OAUTH_GOOGLE_ENABLED === '1',
    microsoft: process.env.NEXT_PUBLIC_OAUTH_MICROSOFT_ENABLED === '1'
  })
  const [legalPaths, setLegalPaths] = useState<Partial<OrbLegalPaths>>(ORB_DEFAULT_LEGAL_PATHS)
  const [oauthRedirecting, setOauthRedirecting] = useState<'google' | 'microsoft' | null>(null)

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
    trackOrbAnalytics('login_viewed')
    setPasskeySupported(orbPasskeysSupported())
    const pendingOAuth = consumeOrbOAuthRedirect()
    if (pendingOAuth === 'google' || pendingOAuth === 'microsoft') {
      setOauthRedirecting(pendingOAuth)
    }
    void fetch(ORB_BILLING_API.authProviders, { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => {
        const data = (body as { data?: { oauth?: Record<string, boolean>; legal?: Partial<OrbLegalPaths> } })?.data
        const providers = data?.oauth
        if (providers) {
          setOauth({
            google: Boolean(providers.google),
            microsoft: Boolean(providers.microsoft)
          })
        }
        if (data?.legal) {
          setLegalPaths({ ...ORB_DEFAULT_LEGAL_PATHS, ...data.legal })
        }
      })
      .catch(() => {
        // Keep build-time flags
      })
    const oauthError = searchParams.get('oauth_error')
    if (oauthError) {
      setError(formatOAuthError(oauthError))
      recordOrbAuthRecoveryEvent({
        auth_state: 'unauthenticated',
        verdict_status: null,
        cookie_present: sessionAuthCookiePresent(),
        frontend_state_cleared: false,
        session_refresh_attempted: false,
        reason: 'oauth_error'
      })
    }
    if (sessionError) setError(sessionError)
  }, [searchParams, sessionError])

  async function afterAuth() {
    if (embeddedGateMode) {
      onLoginSuccess?.()
      return
    }
    await refreshSession()
    try {
      const access = await fetchOrbAccess()
      const target = resolvePostLoginRoute(access)
      if (target !== window.location.pathname) router.replace(target)
    } catch {
      const target = returnUrl.startsWith('/orb') ? returnUrl : ORB_RETURN
      if (target !== window.location.pathname) router.replace(target)
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
      setError(response.message || 'We could not sign you in. Check your email and password.')
      recordOrbAuthRecoveryEvent({
        auth_state: 'unauthenticated',
        verdict_status: null,
        cookie_present: sessionAuthCookiePresent(),
        frontend_state_cleared: false,
        session_refresh_attempted: false,
        reason: 'failed_login'
      })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Sign-in failed. Please try again.')
      recordOrbAuthRecoveryEvent({
        auth_state: 'unauthenticated',
        verdict_status: null,
        cookie_present: sessionAuthCookiePresent(),
        frontend_state_cleared: false,
        session_refresh_attempted: false,
        reason: 'failed_login'
      })
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
        if (result.user && typeof result.user.id !== 'undefined') {
          applySessionUser({
            id: Number(result.user.id),
            email: result.user.email || address,
            role: normaliseRole(result.user.role || 'manager'),
            home_id: result.user.home_id ?? null,
            provider_id: null,
            first_name: null,
            last_name: null,
            is_active: true,
            permissions: [],
            subscription_active: Boolean(result.user.subscription_active),
            subscription_status: result.user.subscription_status || null,
            plan_name: result.user.plan_name ?? null,
            mfa_enabled: Boolean(result.user.mfa_enabled),
            mfa_verified: Boolean(result.user.mfa_verified),
            has_passkeys: Boolean(result.user.has_passkeys)
          })
        }
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
    return (
      <OrbAuthLoadingScreen message="Finishing sign in…" submessage="Securing your ORB Residential access" />
    )
  }

  return (
    <div
      className={`orb-residential-root orb-login-root orb-login-full-viewport ${ORB_MOBILE_VIEWPORT_CLASS} ${themeClass} min-h-[100dvh] min-h-[100svh]`}
      data-orb-login-page
      data-orb-login-full-viewport
      data-orb-login-version={ORB_LOGIN_VERSION}
      data-orb-auth-build-variant={ORB_AUTH_BUILD_VARIANT}
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
        className="orb-login-shell orb-login-flagship-shell orb-login-full-viewport-shell grid min-h-0 w-full grid-cols-1 px-5 py-4 sm:px-8 lg:grid-cols-[58%_42%] lg:gap-0 lg:px-0 lg:pb-0 lg:pt-0"
        data-orb-login-two-column
        data-orb-login-scrollable
      >
        <OrbLoginDesktopHero />

        <div className="orb-login-panel flex min-h-0 flex-col lg:px-2 xl:px-6" data-orb-login-panel-centered>
          <OrbLoginMobileHeader />
          <OrbLoginAuthCard
            error={error}
            oauth={oauth}
            authBusy={authBusy}
            oauthRedirecting={oauthRedirecting}
            legalPaths={legalPaths}
            returnUrl={returnUrl}
            email={email}
            password={password}
            remember={remember}
            submitting={submitting}
            passkeySupported={passkeySupported}
            passkeySubmitting={passkeySubmitting}
            passkeyEmail={passkeyEmail}
            emailExpanded={emailExpanded}
            passkeyExpanded={passkeyExpanded}
            onEmailChange={setEmail}
            onPasswordChange={setPassword}
            onRememberChange={setRemember}
            onPasskeyEmailChange={setPasskeyEmail}
            onEmailExpandedChange={setEmailExpanded}
            onPasskeyExpandedChange={setPasskeyExpanded}
            onSubmit={handleSubmit}
            onPasskeySignIn={() => void handlePasskeySignIn()}
            orbOAuthStartUrl={orbOAuthStartUrl}
          />
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
