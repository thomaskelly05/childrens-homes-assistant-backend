'use client'

import { useState } from 'react'
import Link from 'next/link'

const AUTH_ERROR_PATTERN =
  /auth|401|403|unauthorized|forbidden|session|sign.?in|credential|token/i

export function isOrbStationAuthError(message: string | null | undefined): boolean {
  if (!message) return false
  return AUTH_ERROR_PATTERN.test(message)
}

export function OrbStationAuthError({
  detail,
  signInHref = '/orb/login'
}: {
  detail?: string | null
  signInHref?: string
}) {
  const [showDetails, setShowDetails] = useState(false)

  return (
    <div className="orb-station-auth-error" data-orb-station-auth-error role="alert">
      <p className="orb-station-auth-error__title">Reconnect to continue</p>
      <p className="orb-station-auth-error__body">Your session may have expired.</p>
      <Link href={signInHref} className="orb-station-auth-error__cta" data-orb-station-sign-in-again>
        Sign in again
      </Link>
      {detail ? (
        <div className="orb-station-auth-error__details">
          <button
            type="button"
            className="text-[11px] underline-offset-2 hover:underline"
            onClick={() => setShowDetails((v) => !v)}
            data-orb-station-error-details-toggle
          >
            {showDetails ? 'Hide details' : 'Details'}
          </button>
          {showDetails ? (
            <p className="mt-1 break-words text-left text-[10px] opacity-80" data-orb-station-error-detail>
              {detail}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

export function OrbStationEmptyState({
  title,
  body,
  dataAttr
}: {
  title: string
  body: string
  dataAttr?: string
}) {
  return (
    <div className="orb-station-empty-state" data-orb-station-empty={dataAttr}>
      <p className="orb-station-empty-state__title">{title}</p>
      <p className="orb-station-empty-state__body">{body}</p>
    </div>
  )
}
