'use client'

import { useEffect, useState } from 'react'
import { CreditCard } from 'lucide-react'

import {
  fetchOrbAccess,
  fetchOrbBillingMeter,
  openOrbBillingPortal,
  refreshOrbAccessAfterCheckout,
  startOrbCheckout,
  startOrbTrial,
  type OrbAccessPayload
} from '@/lib/orb/orb-billing-client'

export function OrbBillingSettingsSection() {
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

  async function handleCheckout() {
    setLoading(true)
    try {
      const url = await startOrbCheckout()
      window.location.href = url
    } catch {
      setError('Checkout unavailable')
    } finally {
      setLoading(false)
    }
  }

  async function handlePortal() {
    setLoading(true)
    try {
      const url = await openOrbBillingPortal()
      window.location.href = url
    } catch {
      setError('Billing portal unavailable')
    } finally {
      setLoading(false)
    }
  }

  async function handleTrial() {
    setLoading(true)
    try {
      await startOrbTrial()
      const next = await fetchOrbAccess()
      setAccess(next)
    } catch {
      setError('Trial could not be started')
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
      if (!result.confirmed && !result.access.can_use_orb) {
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
      <p className="text-[11px] leading-5 text-[var(--orb-muted)]">
        {access?.product ?? 'ORB Residential — Powered by IndiCare'} · {access?.price_label ?? '£9.99/month'}
      </p>
      <dl className="grid gap-2 text-xs">
        <div className="flex justify-between gap-4">
          <dt className="text-[var(--orb-muted)]">Plan</dt>
          <dd className="font-medium">{access?.subscription?.plan_name ?? '—'}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-[var(--orb-muted)]">Subscription</dt>
          <dd className="font-medium">{access?.subscription?.status ?? access?.access_state ?? '—'}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-[var(--orb-muted)]">Trial</dt>
          <dd className="font-medium">
            {access?.trial?.active
              ? `Active${access.trial.days_left != null ? ` · ${access.trial.days_left} days left` : ''}`
              : access?.trial?.available
                ? 'Available'
                : 'Not available'}
          </dd>
        </div>
        {access?.subscription?.current_period_end ? (
          <div className="flex justify-between gap-4">
            <dt className="text-[var(--orb-muted)]">Period ends</dt>
            <dd className="font-medium">{String(access.subscription.current_period_end).slice(0, 10)}</dd>
          </div>
        ) : null}
        {meter ? (
          <>
            <div className="flex justify-between gap-4">
              <dt className="text-[var(--orb-muted)]">Usage this period</dt>
              <dd className="font-medium">{String(meter.total_requests ?? 0)} requests</dd>
            </div>
            {meter.soft_limit_warning ? (
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--orb-muted)]">Usage status</dt>
                <dd className="font-medium text-amber-700">{String(meter.soft_limit_warning)}</dd>
              </div>
            ) : null}
            {meter.hard_limit_reached ? (
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--orb-muted)]">Limit</dt>
                <dd className="font-medium text-red-700">Period limit reached</dd>
              </div>
            ) : null}
          </>
        ) : null}
      </dl>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={loading}
          onClick={() => void handleRefreshStatus()}
          className="rounded-lg border px-3 py-2 text-xs font-semibold disabled:opacity-50"
          data-orb-billing-refresh-status
        >
          Refresh billing status
        </button>
        {!access?.can_use_orb && access?.trial?.available ? (
          <button type="button" disabled={loading} onClick={handleTrial} className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white">
            Start trial
          </button>
        ) : null}
        {!access?.subscription?.active ? (
          <button
            type="button"
            disabled={loading || !stripeReady}
            onClick={handleCheckout}
            className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
            data-orb-billing-upgrade
          >
            Upgrade · £9.99/month
          </button>
        ) : (
          <button
            type="button"
            disabled={loading || !stripeReady}
            onClick={handlePortal}
            className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-xs font-semibold disabled:opacity-50"
            data-orb-billing-portal
          >
            <CreditCard className="h-3.5 w-3.5" aria-hidden />
            Manage billing
          </button>
        )}
      </div>
      {!stripeReady && process.env.NODE_ENV === 'development' ? (
        <p className="text-[10px] text-amber-700">Stripe env not configured — billing buttons disabled.</p>
      ) : null}
      <p className="text-[10px] leading-5 text-[var(--orb-muted)]">
        Standalone ORB billing is separate from IndiCare OS. No OS records are accessed through this subscription.
      </p>
    </div>
  )
}
