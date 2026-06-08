'use client'

import { useEffect, useMemo, useState } from 'react'
import { CreditCard } from 'lucide-react'

import { OrbUserAvatar } from '@/components/orb-residential/orb-user-avatar'
import { getOrbBillingDisplayStatus } from '@/lib/orb/orb-billing-display'
import {
  fetchOrbAccess,
  fetchOrbBillingMeter,
  openOrbBillingPortal,
  refreshOrbAccessAfterCheckout,
  startOrbCheckout,
  startOrbTrial,
  type OrbAccessPayload
} from '@/lib/orb/orb-billing-client'

export function OrbBillingSettingsSection({
  userName,
  userEmail,
  avatarUrl
}: {
  userName?: string | null
  userEmail?: string | null
  avatarUrl?: string | null
}) {
  const [access, setAccess] = useState<OrbAccessPayload | null>(null)
  const [meter, setMeter] = useState<Record<string, unknown> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    Promise.all([fetchOrbAccess(), fetchOrbBillingMeter().catch(() => null)])
      .then(([accessPayload, meterPayload]) => {
        setAccess(accessPayload)
        setMeter(meterPayload)
      })
      .catch(() => setError('Billing information could not be loaded.'))
  }, [])

  const stripeReady = Boolean(access?.billing?.stripe_configured)
  const display = useMemo(() => getOrbBillingDisplayStatus(access), [access])
  const usageRequests = meter?.total_requests != null ? String(meter.total_requests) : '0'

  async function handleCheckout() {
    setLoading(true)
    setError(null)
    try {
      const url = await startOrbCheckout()
      window.location.href = url
    } catch {
      setError('Checkout is not available right now. Please try again shortly or contact support.')
    } finally {
      setLoading(false)
    }
  }

  async function handlePortal() {
    setLoading(true)
    setError(null)
    try {
      const url = await openOrbBillingPortal()
      window.location.href = url
    } catch {
      setError('Billing portal is not available right now. Please try again shortly or contact support.')
    } finally {
      setLoading(false)
    }
  }

  async function handleTrial() {
    setLoading(true)
    setError(null)
    try {
      await startOrbTrial()
      const next = await fetchOrbAccess()
      setAccess(next)
    } catch {
      setError('Trial could not be started.')
    } finally {
      setLoading(false)
    }
  }

  async function handleRefreshStatus() {
    setLoading(true)
    setError(null)
    try {
      const result = await refreshOrbAccessAfterCheckout({ maxAttempts: 2, delayMs: 500 })
      setAccess(result.access)
      if (result.meter) setMeter(result.meter)
      else setMeter(await fetchOrbBillingMeter().catch(() => null))
      if (!result.confirmed && !result.access.can_use_orb && !display.isPaidActive) {
        setError('Subscription still confirming. Try again in a moment.')
      }
    } catch {
      setError('Could not refresh billing status.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4" data-orb-billing-settings>
      <div className="flex items-start gap-3 rounded-xl border border-[var(--orb-line)]/40 bg-[var(--orb-surface)]/60 px-3 py-3">
        <OrbUserAvatar name={userName || userEmail} avatarUrl={avatarUrl} size="md" />
        <div className="min-w-0">
          <p className="text-xs font-semibold text-[var(--orb-foreground)]">Manage profile</p>
          <p className="mt-0.5 text-[11px] leading-5 text-[var(--orb-muted)]">
            Name, email, role and account preferences
          </p>
        </div>
      </div>

      <dl className="grid gap-2.5 text-xs">
        <div className="flex justify-between gap-4">
          <dt className="text-[var(--orb-muted)]">Plan</dt>
          <dd className="font-medium">ORB Residential — Individual</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-[var(--orb-muted)]">Subscription</dt>
          <dd className="font-medium capitalize" data-orb-billing-subscription-status>
            {display.subscriptionLabel}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-[var(--orb-muted)]">Billing</dt>
          <dd className="font-medium">{access?.price_label ?? '£9.99/month'}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-[var(--orb-muted)]">Usage this period</dt>
          <dd className="font-medium">{usageRequests} requests</dd>
        </div>
        {display.showTrialChip ? (
          <div className="flex justify-between gap-4" data-orb-billing-trial-chip>
            <dt className="text-[var(--orb-muted)]">Trial</dt>
            <dd className="font-medium">{display.trialChipLabel}</dd>
          </div>
        ) : null}
      </dl>

      {error ? <p className="text-xs text-red-600">{error}</p> : null}

      <div className="flex flex-wrap gap-2">
        {display.showManageBilling ? (
          <button
            type="button"
            disabled={loading || !stripeReady}
            onClick={() => void handlePortal()}
            className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-xs font-semibold disabled:opacity-50"
            data-orb-billing-portal
          >
            <CreditCard className="h-3.5 w-3.5" aria-hidden />
            Manage billing
          </button>
        ) : null}
        <button
          type="button"
          disabled={loading}
          onClick={() => void handleRefreshStatus()}
          className="rounded-lg border px-3 py-2 text-xs font-semibold disabled:opacity-50"
          data-orb-billing-refresh-status
        >
          Refresh billing status
        </button>
        {display.showTrialCta ? (
          <button
            type="button"
            disabled={loading}
            onClick={() => void handleTrial()}
            className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
            data-orb-billing-trial
          >
            Start trial
          </button>
        ) : null}
        {display.showUpgrade ? (
          <button
            type="button"
            disabled={loading || !stripeReady}
            onClick={() => void handleCheckout()}
            className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
            data-orb-billing-upgrade
          >
            Upgrade · £9.99/month
          </button>
        ) : null}
      </div>

      <p className="text-[10px] leading-5 text-[var(--orb-muted)]">
        ORB Residential billing is separate from IndiCare OS. ORB Residential does not grant IndiCare OS access.
      </p>
    </div>
  )
}
