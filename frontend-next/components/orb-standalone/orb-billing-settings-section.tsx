'use client'

import { useEffect, useMemo, useState } from 'react'
import { CreditCard, Settings } from 'lucide-react'

import { OrbUserAvatar } from '@/components/orb-residential/orb-user-avatar'
import { formatOrbPlanLabel, getOrbBillingDisplayStatus } from '@/lib/orb/orb-billing-display'
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
  avatarUrl,
  onOpenProfile
}: {
  userName?: string | null
  userEmail?: string | null
  avatarUrl?: string | null
  onOpenProfile?: () => void
}) {
  const [access, setAccess] = useState<OrbAccessPayload | null>(null)
  const [meter, setMeter] = useState<Record<string, unknown> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)

  useEffect(() => {
    Promise.all([fetchOrbAccess(), fetchOrbBillingMeter().catch(() => null)])
      .then(([accessPayload, meterPayload]) => {
        setAccess(accessPayload)
        setMeter(meterPayload)
        setLoadFailed(false)
      })
      .catch(() => {
        setLoadFailed(true)
        setError('Billing information could not be loaded.')
      })
      .finally(() => setLoading(false))
  }, [])

  const stripeReady = Boolean(access?.billing?.stripe_configured)
  const display = useMemo(
    () =>
      getOrbBillingDisplayStatus(access, {
        isLoading: loading && !access,
        hasError: loadFailed || Boolean(error),
        isSignedIn: true
      }),
    [access, error, loadFailed, loading]
  )
  const usageRequests = meter?.total_requests != null ? String(meter.total_requests) : '0'
  const displayName = userName?.trim() || userEmail?.trim() || 'Your account'
  const email = userEmail?.trim() || null
  const planName = formatOrbPlanLabel(access?.subscription?.plan_name)
  const priceLabel = access?.price_label ?? '£9.99/month'

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
    <div className="space-y-3" data-orb-billing-settings>
      <div className="flex items-start gap-3 rounded-xl border border-[var(--orb-line)]/40 bg-[var(--orb-surface)]/60 px-3 py-2.5">
        <OrbUserAvatar name={displayName} avatarUrl={avatarUrl} size="md" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-[var(--orb-foreground)]">{displayName}</p>
          {email ? (
            <p className="truncate text-xs text-[var(--orb-muted)]">{email}</p>
          ) : null}
          {onOpenProfile ? (
            <button
              type="button"
              onClick={onOpenProfile}
              className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium text-[var(--orb-res-primary,#1677ff)] hover:underline"
              data-orb-billing-settings-profile
            >
              <Settings className="h-3 w-3" aria-hidden />
              Role and preferences
            </button>
          ) : null}
        </div>
      </div>

      <dl className="grid gap-2 text-xs sm:grid-cols-2">
        <div className="flex justify-between gap-3 sm:block">
          <dt className="text-[var(--orb-muted)]">Plan</dt>
          <dd className="font-medium sm:mt-0.5">{planName}</dd>
        </div>
        <div className="flex justify-between gap-3 sm:block">
          <dt className="text-[var(--orb-muted)]">Subscription</dt>
          <dd className="font-medium capitalize sm:mt-0.5" data-orb-billing-subscription-status>
            {display.subscriptionLabel}
          </dd>
        </div>
        <div className="flex justify-between gap-3 sm:block">
          <dt className="text-[var(--orb-muted)]">Billing</dt>
          <dd className="font-medium sm:mt-0.5">{priceLabel}</dd>
        </div>
        <div className="flex justify-between gap-3 sm:block">
          <dt className="text-[var(--orb-muted)]">Usage</dt>
          <dd className="font-medium sm:mt-0.5">{usageRequests} requests</dd>
        </div>
        {display.showTrialChip ? (
          <div className="flex justify-between gap-3 sm:col-span-2 sm:block" data-orb-billing-trial-chip>
            <dt className="text-[var(--orb-muted)]">Trial</dt>
            <dd className="font-medium sm:mt-0.5">{display.trialChipLabel}</dd>
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
        ORB Residential billing is separate from IndiCare OS.
      </p>
    </div>
  )
}
