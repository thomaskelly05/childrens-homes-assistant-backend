'use client'

import { useEffect, useState } from 'react'
import { CreditCard } from 'lucide-react'

import { OrbAppModal } from '@/components/orb-standalone/orb-app-modal'
import {
  fetchOrbAccess,
  fetchOrbBillingMeter,
  openOrbBillingPortal,
  refreshOrbAccessAfterCheckout,
  startOrbCheckout,
  startOrbTrial,
  type OrbAccessPayload
} from '@/lib/orb/orb-billing-client'

const PLAN_FEATURES = [
  'ORB chat',
  'Review This',
  'Templates',
  'Knowledge Centre',
  'Documents',
  'Saved Outputs'
]

export function OrbBillingModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [access, setAccess] = useState<OrbAccessPayload | null>(null)
  const [meter, setMeter] = useState<Record<string, unknown> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [spendingCap, setSpendingCap] = useState('')

  useEffect(() => {
    if (!open) return
    Promise.all([fetchOrbAccess(), fetchOrbBillingMeter().catch(() => null)])
      .then(([accessPayload, meterPayload]) => {
        setAccess(accessPayload)
        setMeter(meterPayload)
      })
      .catch(() => {
        setError('Billing information could not be loaded.')
      })
  }, [open])

  const stripeReady = Boolean(access?.billing?.stripe_configured)
  const statusLabel =
    access?.subscription?.status ?? access?.access_state ?? (access?.trial?.active ? 'trial' : 'inactive')

  async function handleCheckout() {
    setLoading(true)
    try {
      const url = await startOrbCheckout()
      window.location.href = url
    } catch {
      setError('Checkout unavailable. Billing is almost ready — you can manage your subscription through Stripe when enabled.')
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
      setError('Billing portal unavailable.')
    } finally {
      setLoading(false)
    }
  }

  async function handleTrial() {
    setLoading(true)
    try {
      await startOrbTrial()
      setAccess(await fetchOrbAccess())
    } catch {
      setError('Trial could not be started.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <OrbAppModal
      open={open}
      title="Billing"
      subtitle="Manage your ORB Residential subscription and usage."
      onClose={onClose}
      panelId="billing"
      size="compact"
    >
      <div className="space-y-5 p-4" data-orb-billing-modal>
        <section className="orb-doc-glass-card rounded-xl border border-[var(--orb-line)] p-4" data-orb-billing-plan-card>
          <p className="text-sm font-semibold text-[var(--orb-foreground)]">ORB Residential</p>
          <p className="mt-1 text-lg font-semibold text-[#5ec8ff]">£9.99/month</p>
          <ul className="mt-3 space-y-1 text-xs text-[var(--orb-muted)]">
            {PLAN_FEATURES.map((feature) => (
              <li key={feature} className="flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-cyan-400" aria-hidden />
                {feature}
              </li>
            ))}
          </ul>
        </section>

        <section data-orb-billing-status>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--orb-muted)]">Status</h3>
          <dl className="mt-2 grid gap-2 text-xs">
            <div className="flex justify-between gap-4">
              <dt className="text-[var(--orb-muted)]">Subscription</dt>
              <dd className="font-medium capitalize">{statusLabel}</dd>
            </div>
            {access?.subscription?.current_period_end ? (
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--orb-muted)]">Renews</dt>
                <dd className="font-medium">{String(access.subscription.current_period_end).slice(0, 10)}</dd>
              </div>
            ) : null}
            {access?.trial?.active ? (
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--orb-muted)]">Trial</dt>
                <dd className="font-medium">
                  Active{access.trial.days_left != null ? ` · ${access.trial.days_left} days left` : ''}
                </dd>
              </div>
            ) : null}
          </dl>
        </section>

        <section data-orb-billing-usage>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--orb-muted)]">Usage</h3>
          <dl className="mt-2 grid gap-2 text-xs">
            <div className="flex justify-between gap-4">
              <dt className="text-[var(--orb-muted)]">Messages this period</dt>
              <dd className="font-medium">{String(meter?.total_requests ?? meter?.messages_used ?? '—')}</dd>
            </div>
            {meter?.soft_limit_warning ? (
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--orb-muted)]">Warning</dt>
                <dd className="font-medium text-amber-300">{String(meter.soft_limit_warning)}</dd>
              </div>
            ) : null}
          </dl>
        </section>

        <section data-orb-billing-spending-cap>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--orb-muted)]">Spending cap</h3>
          <p className="mt-1 text-[11px] leading-5 text-[var(--orb-muted)]">
            Set a monthly cap for additional usage beyond your plan allowance.
          </p>
          <div className="mt-2 flex gap-2">
            <input
              type="number"
              min={0}
              value={spendingCap}
              onChange={(e) => setSpendingCap(e.target.value)}
              placeholder="Monthly cap (£)"
              className="min-w-0 flex-1 rounded-lg border border-[var(--orb-line)] bg-[var(--orb-surface-elevated)] px-3 py-2 text-xs text-[var(--orb-foreground)]"
            />
            <button
              type="button"
              className="rounded-lg border border-[var(--orb-line)] px-3 py-2 text-xs font-semibold text-[var(--orb-muted)]"
              disabled
              title="Spending cap will be available when billing meter is fully enabled"
            >
              Set cap
            </button>
          </div>
        </section>

        <section data-orb-billing-buy-more>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--orb-muted)]">Buy more</h3>
          <p className="mt-1 text-[11px] text-[var(--orb-muted)]">
            Top up with extra usage credits via Stripe Checkout (card, Apple Pay or Google Pay where supported).
          </p>
        </section>

        {error ? <p className="text-xs text-amber-300/90">{error}</p> : null}

        <div className="flex flex-wrap gap-2">
          {!access?.can_use_orb && access?.trial?.available ? (
            <button
              type="button"
              disabled={loading}
              onClick={() => void handleTrial()}
              className="rounded-lg bg-cyan-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
              data-orb-billing-trial
            >
              Start free trial
            </button>
          ) : null}
          {!access?.subscription?.active ? (
            <button
              type="button"
              disabled={loading || !stripeReady}
              onClick={() => void handleCheckout()}
              className="rounded-lg bg-gradient-to-r from-[#168bff] to-[#0d5fcc] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
              data-orb-billing-upgrade
            >
              Subscribe · £9.99/month
            </button>
          ) : (
            <button
              type="button"
              disabled={loading || !stripeReady}
              onClick={() => void handlePortal()}
              className="inline-flex items-center gap-1 rounded-lg border border-[var(--orb-line)] px-3 py-2 text-xs font-semibold disabled:opacity-50"
              data-orb-billing-portal
            >
              <CreditCard className="h-3.5 w-3.5" aria-hidden />
              Manage subscription
            </button>
          )}
          <button
            type="button"
            disabled={loading}
            onClick={() => {
              void refreshOrbAccessAfterCheckout({ maxAttempts: 2, delayMs: 500 }).then((result) => {
                setAccess(result.access)
                if (result.meter) setMeter(result.meter)
              })
            }}
            className="rounded-lg border border-[var(--orb-line)] px-3 py-2 text-xs font-semibold"
            data-orb-billing-refresh
          >
            Refresh status
          </button>
        </div>

        {!stripeReady ? (
          <p className="text-[10px] leading-5 text-[var(--orb-muted)]" data-orb-billing-stripe-fallback>
            Billing is almost ready. You can manage your subscription through Stripe when enabled.
          </p>
        ) : null}
      </div>
    </OrbAppModal>
  )
}
