import Link from 'next/link'
import type { ReactNode } from 'react'

import { clsx } from 'clsx'

import { isOrbOAuthStartPath, navigateOrbOAuthStart, type OrbOAuthProvider } from '@/lib/orb/orb-oauth-navigation'

export type OrbAuthProvider = 'microsoft' | 'google' | 'apple' | 'email' | 'passkey'

function MicrosoftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 21 21" aria-hidden>
      <rect x="1" y="1" width="9" height="9" fill="#f25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
      <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
      <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
    </svg>
  )
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  )
}

function AppleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </svg>
  )
}

function EmailIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  )
}

function PasskeyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />
      <path d="M6 21v-1a6 6 0 0 1 12 0v1" />
      <path d="M16 11h5M18.5 8.5v5" strokeLinecap="round" />
    </svg>
  )
}

export function OrbAuthProviderIcon({
  provider,
  className = 'h-5 w-5 shrink-0'
}: {
  provider: OrbAuthProvider
  className?: string
}) {
  switch (provider) {
    case 'microsoft':
      return <MicrosoftIcon className={className} />
    case 'google':
      return <GoogleIcon className={className} />
    case 'apple':
      return <AppleIcon className={className} />
    case 'email':
      return <EmailIcon className={className} />
    case 'passkey':
      return <PasskeyIcon className={className} />
    default:
      return null
  }
}

export function OrbAuthButton({
  href,
  disabled,
  children,
  provider,
  className,
  onClick,
  type = 'link'
}: {
  href?: string
  disabled?: boolean
  children: ReactNode
  provider: OrbAuthProvider
  className?: string
  onClick?: () => void
  type?: 'link' | 'button'
}) {
  const base = clsx(
    'orb-auth-button flex w-full items-center justify-center gap-2.5 rounded-2xl border px-4 py-3 text-sm font-semibold transition min-h-[3rem] sm:min-h-[3.25rem]',
    disabled ? 'orb-auth-button--disabled cursor-not-allowed' : 'orb-auth-button--enabled',
    className
  )

  const content = (
    <>
      <OrbAuthProviderIcon provider={provider} />
      <span>{children}</span>
    </>
  )

  if (type === 'button' || onClick) {
    return (
      <button
        type="button"
        className={base}
        data-orb-oauth={provider}
        disabled={disabled}
        onClick={onClick}
      >
        {content}
      </button>
    )
  }

  if (disabled || !href) {
    return (
      <span className={base} data-orb-oauth={provider} aria-disabled>
        {content}
      </span>
    )
  }

  if (isOrbOAuthStartPath(href)) {
    const oauthProvider = provider as OrbOAuthProvider
    return (
      <button
        type="button"
        className={base}
        data-orb-oauth={provider}
        onClick={() => {
          try {
            const parsed = new URL(href, window.location.origin)
            const returnUrl = parsed.searchParams.get('return_url') || '/orb'
            navigateOrbOAuthStart(oauthProvider, returnUrl)
          } catch {
            navigateOrbOAuthStart(oauthProvider, '/orb')
          }
        }}
      >
        {content}
      </button>
    )
  }

  return (
    <Link href={href} prefetch={false} className={base} data-orb-oauth={provider}>
      {content}
    </Link>
  )
}
