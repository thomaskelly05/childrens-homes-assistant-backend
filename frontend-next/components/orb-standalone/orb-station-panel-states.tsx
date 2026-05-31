'use client'

import { useState } from 'react'
import Link from 'next/link'

const AUTH_ERROR_PATTERN =
  /auth|401|403|unauthorized|forbidden|session|sign.?in|credential|token/i

export function isOrbStationAuthError(message: string | null | undefined): boolean {
  if (!message) return false
  return AUTH_ERROR_PATTERN.test(message)
}

/** Full sign-in blocker only when the user is not in an active ORB session. */
export function shouldBlockStationForAuth(
  sessionReady: boolean,
  error: string | null | undefined
): boolean {
  if (!error || !isOrbStationAuthError(error)) return false
  return !sessionReady
}

export function OrbStationReconnectBanner({
  onRefresh
}: {
  onRefresh?: () => void
}) {
  return (
    <div
      className="orb-station-reconnect-banner mb-3 rounded-xl border border-amber-400/25 bg-amber-400/10 px-3 py-2.5 text-xs leading-5 text-amber-100/95"
      data-orb-station-reconnect-banner
      role="status"
    >
      <p className="font-medium">Reconnect to sync</p>
      <p className="mt-0.5 text-amber-100/80">
        You are signed in — local content is still available. Refresh when your connection is stable.
      </p>
      {onRefresh ? (
        <button
          type="button"
          className="mt-2 rounded-full border border-amber-300/40 px-3 py-1 text-[11px] font-semibold text-amber-50 hover:bg-amber-400/15"
          onClick={onRefresh}
          data-orb-station-reconnect-refresh
        >
          Refresh
        </button>
      ) : null}
    </div>
  )
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
