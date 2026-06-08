'use client'

import { FormEvent } from 'react'
import Link from 'next/link'

import { OrbAuthButton } from '@/components/orb-residential/ui/orb-auth-button'
import { OrbLoginLegalFooter } from '@/components/orb-residential/orb-login-legal-footer'
import { OrbLoginMobileHeader } from '@/components/orb-residential/orb-login-mobile-header'

const OAUTH_UNAVAILABLE_COPY: Record<'google' | 'microsoft' | 'apple', string> = {
  google: 'Google sign-in unavailable',
  microsoft: 'Microsoft sign-in unavailable',
  apple: 'Apple sign-in unavailable'
}

export type OrbLoginAuthCardProps = {
  error: string | null
  oauth: { google: boolean; microsoft: boolean; apple: boolean }
  authBusy: boolean
  returnUrl: string
  email: string
  password: string
  remember: boolean
  submitting: boolean
  passkeySupported: boolean
  passkeySubmitting: boolean
  passkeyEmail: string
  compactViewport: boolean
  passkeyExpanded: boolean
  onEmailChange: (value: string) => void
  onPasswordChange: (value: string) => void
  onRememberChange: (value: boolean) => void
  onPasskeyEmailChange: (value: string) => void
  onPasskeyExpandedChange: (expanded: boolean) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onPasskeySignIn: () => void
  orbOAuthStartUrl: (provider: 'apple' | 'google' | 'microsoft', returnUrl: string) => string
}

/** Shared auth card — OAuth, create account, email/password, passkey and legal footer. */
export function OrbLoginAuthCard({
  error,
  oauth,
  authBusy,
  returnUrl,
  email,
  password,
  remember,
  submitting,
  passkeySupported,
  passkeySubmitting,
  passkeyEmail,
  compactViewport,
  passkeyExpanded,
  onEmailChange,
  onPasswordChange,
  onRememberChange,
  onPasskeyEmailChange,
  onPasskeyExpandedChange,
  onSubmit,
  onPasskeySignIn,
  orbOAuthStartUrl
}: OrbLoginAuthCardProps) {
  return (
    <div
      className="orb-login-card orb-login-panel-inner mx-auto w-full max-w-md rounded-[1.75rem] border border-[var(--orb-line)]/50 bg-[var(--orb-surface-elevated)]/80 p-6 shadow-xl shadow-black/10 backdrop-blur-sm sm:p-8"
      data-orb-login-auth-card
    >
      <OrbLoginMobileHeader />

      <h2
        className="orb-login-signin-title mt-2 text-2xl font-bold tracking-tight lg:mt-0"
        data-orb-login-signin-title
        data-orb-login-signin-title-mobile
      >
        <span className="lg:hidden">Sign in to continue</span>
        <span className="hidden lg:inline">Sign in to ORB Residential</span>
      </h2>
      <p className="orb-login-lead mt-2 text-sm" data-orb-login-mobile-lead>
        Use your work account, email or passkey.
      </p>

      {error ? (
        <p className="orb-login-error mt-4 rounded-2xl px-4 py-3 text-sm" role="alert">
          {error}
        </p>
      ) : null}

      <section className="mt-6" aria-labelledby="orb-login-oauth">
        <h3 id="orb-login-oauth" className="orb-login-section-title text-xs font-semibold uppercase tracking-wide">
          Continue with
        </h3>
        <div className="mt-2.5 space-y-2.5" data-orb-oauth-buttons>
          <OrbAuthButton
            provider="apple"
            href={oauth.apple ? orbOAuthStartUrl('apple', returnUrl) : undefined}
            disabled={!oauth.apple || authBusy}
            unavailableLabel={OAUTH_UNAVAILABLE_COPY.apple}
          >
            Continue with Apple
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
            provider="microsoft"
            href={oauth.microsoft ? orbOAuthStartUrl('microsoft', returnUrl) : undefined}
            disabled={!oauth.microsoft || authBusy}
            unavailableLabel={OAUTH_UNAVAILABLE_COPY.microsoft}
          >
            Continue with Microsoft
          </OrbAuthButton>
        </div>
      </section>

      <section className="mt-6" aria-labelledby="orb-login-create-account" data-orb-login-account-links>
        <h3
          id="orb-login-create-account"
          className="orb-login-section-title text-xs font-semibold uppercase tracking-wide"
        >
          New to ORB Residential?
        </h3>
        <Link
          href="/orb/signup"
          className="orb-login-submit mt-2.5 flex w-full items-center justify-center rounded-2xl py-3 text-center text-sm font-bold no-underline"
          data-orb-create-account
        >
          Create account
        </Link>
      </section>

      <section className="mt-6" aria-labelledby="orb-login-email">
        <h3 id="orb-login-email" className="orb-login-section-title text-xs font-semibold uppercase tracking-wide">
          Already have an account?
        </h3>
        <form className="mt-2.5 space-y-3" onSubmit={onSubmit} data-testid="orb-login-form">
          <label className="orb-login-field-label block text-sm font-medium">
            Email
            <input
              type="email"
              required
              value={email}
              onChange={(e) => onEmailChange(e.target.value)}
              className="orb-login-input mt-2 w-full rounded-2xl px-4 py-3"
              data-testid="orb-login-email"
              autoComplete="email"
              disabled={authBusy}
            />
          </label>
          <label className="orb-login-field-label block text-sm font-medium">
            Password
            <input
              type="password"
              required
              value={password}
              onChange={(e) => onPasswordChange(e.target.value)}
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
              onChange={(e) => onRememberChange(e.target.checked)}
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
      </section>

      {passkeySupported ? (
        <section className="mt-6" aria-labelledby="orb-login-passkey" data-orb-login-passkey-section>
          {compactViewport ? (
            <button
              type="button"
              className="orb-login-section-title flex w-full items-center justify-between text-left text-xs font-semibold uppercase tracking-wide"
              id="orb-login-passkey"
              onClick={() => onPasskeyExpandedChange(!passkeyExpanded)}
              aria-expanded={passkeyExpanded}
              data-orb-passkey-toggle
            >
              <span>Use passkey</span>
              <span className="text-[10px] normal-case tracking-normal text-[var(--orb-muted)]">
                {passkeyExpanded ? 'Hide' : 'Show'}
              </span>
            </button>
          ) : (
            <h3 id="orb-login-passkey" className="orb-login-section-title text-xs font-semibold uppercase tracking-wide">
              Use passkey
            </h3>
          )}
          {passkeyExpanded || !compactViewport ? (
            <>
              <p className="orb-login-muted mt-2 text-xs leading-relaxed">
                Use Face ID, Touch ID or device passkey.
              </p>
              <label className="orb-login-field-label mt-3 block text-xs">
                Email
                <input
                  type="email"
                  value={passkeyEmail || email}
                  onChange={(e) => onPasskeyEmailChange(e.target.value)}
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
                  onClick={onPasskeySignIn}
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

      <OrbLoginLegalFooter />
    </div>
  )
}
