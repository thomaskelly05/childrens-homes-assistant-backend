'use client'

import { FormEvent } from 'react'
import Link from 'next/link'

import { OrbAuthButton } from '@/components/orb-residential/ui/orb-auth-button'
import { OrbLoginLegalFooter } from '@/components/orb-residential/orb-login-legal-footer'
import { OrbRequestDemoLink } from '@/components/orb-residential/orb-request-demo-link'
import type { OrbLegalPaths } from '@/components/orb-residential/orb-legal-links'
import { ORB_LOGIN_PROFESSIONAL_BOUNDARY } from '@/lib/orb/orb-login-stations-copy'
import { orbOAuthRedirectMessage } from '@/lib/orb/orb-oauth-redirect-state'

const OAUTH_UNAVAILABLE_COPY: Record<'google' | 'microsoft', string> = {
  google: 'Google sign-in unavailable',
  microsoft: 'Microsoft sign-in unavailable'
}

export type OrbLoginAuthCardProps = {
  error: string | null
  oauth: { google: boolean; microsoft: boolean }
  authBusy: boolean
  oauthRedirecting: 'google' | 'microsoft' | null
  returnUrl: string
  email: string
  password: string
  remember: boolean
  submitting: boolean
  passkeySupported: boolean
  passkeySubmitting: boolean
  passkeyEmail: string
  emailExpanded: boolean
  passkeyExpanded: boolean
  legalPaths?: Partial<OrbLegalPaths>
  onEmailChange: (value: string) => void
  onPasswordChange: (value: string) => void
  onRememberChange: (value: boolean) => void
  onPasskeyEmailChange: (value: string) => void
  onEmailExpandedChange: (expanded: boolean) => void
  onPasskeyExpandedChange: (expanded: boolean) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onPasskeySignIn: () => void
  orbOAuthStartUrl: (provider: 'google' | 'microsoft', returnUrl: string) => string
}

/** Shared auth card — OAuth, create account, email/password, passkey and legal footer. */
export function OrbLoginAuthCard({
  error,
  oauth,
  authBusy,
  oauthRedirecting,
  returnUrl,
  email,
  password,
  remember,
  submitting,
  passkeySupported,
  passkeySubmitting,
  passkeyEmail,
  emailExpanded,
  passkeyExpanded,
  legalPaths,
  onEmailChange,
  onPasswordChange,
  onRememberChange,
  onPasskeyEmailChange,
  onEmailExpandedChange,
  onPasskeyExpandedChange,
  onSubmit,
  onPasskeySignIn,
  orbOAuthStartUrl
}: OrbLoginAuthCardProps) {
  const oauthBusy = authBusy || oauthRedirecting !== null

  return (
    <div
      className="orb-login-auth-card orb-login-card orb-login-panel-inner orb-login-auth-card--readable orb-login-flagship-auth mx-auto w-full max-w-md p-0 lg:rounded-[1.75rem] lg:border lg:p-7 lg:shadow-xl"
      data-orb-login-flagship-auth
      data-orb-login-auth-card
    >
      <h2
        className="orb-login-signin-title text-left text-[1.375rem] font-semibold leading-tight tracking-tight lg:mt-0 lg:text-[1.625rem]"
        data-orb-login-signin-title
        data-orb-login-signin-title-mobile
      >
        Welcome to ORB Residential
      </h2>
      <p
        className="orb-login-lead mt-1.5 text-left text-sm leading-relaxed text-[var(--orb-muted)]"
        data-orb-login-mobile-lead
      >
        Sign in to continue to the specialist intelligence workspace for children&apos;s homes.
      </p>

      {error ? (
        <p className="orb-login-error mt-3 rounded-2xl px-4 py-2.5 text-sm" role="alert">
          {error}
        </p>
      ) : null}

      <section className="orb-login-auth-section" aria-labelledby="orb-login-oauth" data-orb-login-auth-actions>
        <h3 id="orb-login-oauth" className="sr-only">
          Social sign-in
        </h3>
        <div className="space-y-2" data-orb-oauth-buttons>
          <OrbAuthButton
            provider="google"
            href={oauth.google ? orbOAuthStartUrl('google', returnUrl) : undefined}
            disabled={!oauth.google || oauthBusy}
            loading={oauthRedirecting === 'google'}
            loadingLabel={orbOAuthRedirectMessage('google') ?? 'Redirecting to Google…'}
            unavailableLabel={OAUTH_UNAVAILABLE_COPY.google}
          >
            Continue with Google
          </OrbAuthButton>
          <OrbAuthButton
            provider="microsoft"
            href={oauth.microsoft ? orbOAuthStartUrl('microsoft', returnUrl) : undefined}
            disabled={!oauth.microsoft || oauthBusy}
            loading={oauthRedirecting === 'microsoft'}
            loadingLabel={orbOAuthRedirectMessage('microsoft') ?? 'Redirecting to Microsoft…'}
            unavailableLabel={OAUTH_UNAVAILABLE_COPY.microsoft}
          >
            Continue with Microsoft
          </OrbAuthButton>
        </div>
      </section>

      <section className="orb-login-auth-section" aria-labelledby="orb-login-create-account" data-orb-login-account-links>
        <h3 id="orb-login-create-account" className="sr-only">
          Create account
        </h3>
        <Link
          href="/orb/signup"
          className="orb-login-create-account flex w-full items-center justify-center rounded-xl border border-[var(--orb-line)]/35 bg-transparent py-2.5 text-center text-sm font-semibold no-underline transition hover:border-[var(--orb-res-primary,#6366f1)]/30 hover:bg-[var(--orb-surface-elevated)]/30 lg:rounded-2xl lg:bg-[var(--orb-surface-elevated)]/50"
          data-orb-create-account
        >
          Create account
        </Link>
      </section>

      <section className="orb-login-auth-section" aria-labelledby="orb-login-email">
        {emailExpanded ? (
          <>
            <div className="orb-login-section-header flex items-center justify-between gap-2">
              <h3 id="orb-login-email" className="orb-login-section-title text-sm font-medium">
                Sign in with email
              </h3>
              <button
                type="button"
                className="orb-login-link-subtle text-xs font-medium"
                onClick={() => onEmailExpandedChange(false)}
                data-orb-email-toggle
                aria-expanded
              >
                Hide
              </button>
            </div>
            <form className="mt-2 space-y-2.5" onSubmit={onSubmit} data-testid="orb-login-form">
              <label className="orb-login-field-label block text-sm">
                Email
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => onEmailChange(e.target.value)}
                  className="orb-login-input mt-1.5 w-full rounded-xl px-3.5 py-2.5"
                  data-testid="orb-login-email"
                  autoComplete="email"
                  disabled={oauthBusy}
                />
              </label>
              <label className="orb-login-field-label block text-sm">
                Password
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => onPasswordChange(e.target.value)}
                  className="orb-login-input mt-1.5 w-full rounded-xl px-3.5 py-2.5"
                  data-testid="orb-login-password"
                  autoComplete="current-password"
                  disabled={oauthBusy}
                />
              </label>
              <label className="flex items-center gap-2 text-xs text-[var(--orb-muted)]">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => onRememberChange(e.target.checked)}
                  className="rounded border-[var(--orb-line)]/40"
                  disabled={oauthBusy}
                />
                Keep me signed in on this device
              </label>
              <button
                type="submit"
                disabled={oauthBusy}
                className="orb-login-submit w-full rounded-xl py-2.5 text-sm font-semibold disabled:opacity-60"
                data-testid="orb-login-submit"
              >
                {submitting ? 'Signing in…' : 'Sign in with email'}
              </button>
              <p className="text-center text-xs">
                <Link href="/mfa" className="orb-login-link-subtle font-medium" data-orb-authenticator-fallback>
                  Use authenticator app instead
                </Link>
              </p>
            </form>
          </>
        ) : (
          <button
            type="button"
            className="orb-login-secondary-toggle flex w-full items-center justify-between rounded-xl border border-dashed border-[var(--orb-line)]/35 px-3.5 py-2.5 text-left text-sm font-medium transition hover:border-[var(--orb-res-primary,#6366f1)]/35 hover:bg-[var(--orb-surface-elevated)]/40"
            id="orb-login-email"
            onClick={() => onEmailExpandedChange(true)}
            aria-expanded={false}
            data-orb-email-toggle
            data-orb-email-collapsed
            disabled={oauthBusy}
          >
            <span>Sign in with email</span>
            <span className="text-xs font-normal text-[var(--orb-muted)]">Expand</span>
          </button>
        )}
      </section>

      {passkeySupported ? (
        <section className="orb-login-auth-section orb-login-auth-section--secondary" aria-labelledby="orb-login-passkey" data-orb-login-passkey-section>
          <button
            type="button"
            className="orb-login-secondary-toggle flex w-full items-center justify-between rounded-xl px-1 py-1 text-left text-sm font-medium text-[var(--orb-muted)] transition hover:text-[var(--orb-text)]"
            id="orb-login-passkey"
            onClick={() => onPasskeyExpandedChange(!passkeyExpanded)}
            aria-expanded={passkeyExpanded}
            data-orb-passkey-toggle
            data-orb-passkey-collapsed={passkeyExpanded ? undefined : 'true'}
          >
            <span>Use passkey</span>
            <span className="text-xs font-normal">{passkeyExpanded ? 'Hide' : 'Show'}</span>
          </button>
          {passkeyExpanded ? (
            <div className="mt-2 space-y-2">
              <p className="orb-login-muted text-xs leading-relaxed">
                Use Face ID, Touch ID or your device passkey.
              </p>
              <label className="orb-login-field-label block text-xs">
                Email
                <input
                  type="email"
                  value={passkeyEmail || email}
                  onChange={(e) => onPasskeyEmailChange(e.target.value)}
                  placeholder="you@provider.co.uk"
                  className="orb-login-input mt-1 w-full rounded-xl px-3 py-2 text-sm"
                  autoComplete="email webauthn"
                  data-orb-passkey-email
                  disabled={oauthBusy}
                />
              </label>
              <OrbAuthButton
                provider="passkey"
                type="button"
                disabled={oauthBusy}
                onClick={onPasskeySignIn}
                data-orb-passkey-sign-in
              >
                {passkeySubmitting ? 'Checking passkey…' : 'Use passkey'}
              </OrbAuthButton>
            </div>
          ) : null}
        </section>
      ) : (
        <p className="orb-login-muted orb-login-auth-section--secondary mt-3 text-xs" data-orb-passkey-unavailable>
          Passkeys are not available on this device.
        </p>
      )}

      <p className="orb-login-adult-reviewed mt-4 text-center text-xs leading-relaxed text-[var(--orb-muted)]" data-orb-login-adult-reviewed>
        Every output remains adult-reviewed.
      </p>

      <p
        className="orb-login-boundary mt-3 hidden rounded-xl border border-[var(--orb-line)]/45 bg-[var(--orb-surface-elevated)]/50 px-3 py-2 text-xs leading-relaxed text-[var(--orb-muted)] lg:block"
        data-orb-login-auth-boundary
      >
        {ORB_LOGIN_PROFESSIONAL_BOUNDARY}
      </p>

      <OrbLoginLegalFooter legalPaths={legalPaths} />

      <p className="orb-login-demo-route mt-4 text-center text-sm lg:hidden" data-orb-login-demo-path data-orb-login-demo-visible data-orb-login-demo-route>
        Not using ORB yet?{' '}
        <OrbRequestDemoLink surface="login" className="font-semibold text-[var(--orb-primary)] underline-offset-2 hover:underline" />
      </p>
      <p className="orb-login-demo-route mt-4 hidden text-center text-sm lg:block" data-orb-login-demo-path data-orb-login-demo-visible data-orb-login-demo-route>
        Not using ORB yet?{' '}
        <OrbRequestDemoLink surface="login" className="font-semibold text-[var(--orb-primary)] underline-offset-2 hover:underline" />
      </p>
    </div>
  )
}
