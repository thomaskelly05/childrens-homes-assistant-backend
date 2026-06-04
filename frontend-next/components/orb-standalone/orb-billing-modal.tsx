'use client'

import { useEffect, useMemo, useState } from 'react'
import { CreditCard, RefreshCw, Wallet } from 'lucide-react'

import { OrbLegalLinks } from '@/components/orb-residential/orb-legal-links'
import { OrbAppModal } from '@/components/orb-standalone/orb-app-modal'
import {
  fetchOrbAccess,
  fetchOrbUsage,
  openOrbBillingPortal,
  refreshOrbAccessAfterCheckout,
  saveOrbSpendingCap,
  startOrbCheckout,
  startOrbTopUpCheckout,
  startOrbTrial,
  type OrbAccessPayload,
  type OrbUsageSummary
} from '@/lib/orb/orb-billing-client'

const INDIVIDUAL_PLAN_FEATURES = [
  'ORB chat',
  'Dictate',
  'Voice',
  'Documents',
  'Templates',
  'Saved outputs'
] as const

const TOP_UP_OPTIONS = [
  { label: '£5', pence: 500 },
  { label: '£10', pence: 1000 },
  { label: '£25', pence: 2500 },
  { label: '£50', pence: 5000 }
] as const

function cardClassName() {
  return 'orb-billing-card orb-mobile-workspace-card orb-doc-glass-card rounded-2xl border border-[var(--orb-mobile-ws-card-border,var(--orb-line))] bg-[var(--orb-mobile-ws-card,rgba(8,17,31,0.92))] p-5 text-[var(--orb-mobile-ws-text,var(--orb-foreground))] shadow-[var(--orb-res-shadow,0_10px_28px_rgba(15,23,42,0.06))]'
}

function formatSubscriptionStatus(access: OrbAccessPayload | null, subscriptionActive: boolean): string {
  if (!access) return 'Loading…'
  if (access.trial?.active) {
    const days = access.trial.days_left != null ? ` · ${access.trial.days_left} days left` : ''
    return `Trial active${days}`
  }
  const state = access.access_state
  if (state === 'subscription_past_due' || access.subscription?.status === 'past_due') {
    return 'Past due'
  }
  if (state === 'subscription_cancelled') return 'Cancelled'
  if (state === 'subscription_incomplete') return 'Incomplete'
  if (subscriptionActive) {
    const raw = access.subscription?.status
    return raw ? raw.replace(/_/g, ' ') : 'Active'
  }
  return 'Inactive'
}

export function OrbBillingModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [access, setAccess] = useState<OrbAccessPayload | null>(null)
  const [usage, setUsage] = useState<OrbUsageSummary | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [checkoutOpening, setCheckoutOpening] = useState(false)
  const [monthlyCapPounds, setMonthlyCapPounds] = useState('')
  const [warningPercent, setWarningPercent] = useState('80')
  const [allowOverage, setAllowOverage] = useState(false)

  async function loadBilling() {
    const [accessPayload, usagePayload] = await Promise.all([
      fetchOrbAccess(),
      fetchOrbUsage().catch(() => null)
    ])
    setAccess(accessPayload)
    setUsage(usagePayload)
    if (usagePayload?.monthly_cap_pence != null) {
      setMonthlyCapPounds(String(Math.round(usagePayload.monthly_cap_pence / 100)))
    }
    if (usagePayload?.warning_threshold_percent != null) {
      setWarningPercent(String(usagePayload.warning_threshold_percent))
    }
    setAllowOverage(Boolean(usagePayload?.allow_overage))
  }

  useEffect(() => {
    if (!open) return
    setError(null)
    setNotice(null)
    setLoading(true)
    void loadBilling()
      .catch(() => {
        setError('Billing information could not be loaded. You can still subscribe when checkout is available.')
      })
      .finally(() => setLoading(false))
  }, [open])

  const stripeReady = Boolean(access?.billing?.stripe_configured)
  const subscriptionActive = Boolean(
    access?.can_use_orb || access?.subscription?.active || access?.trial?.active
  )
  const displayStatus = useMemo(
    () => formatSubscriptionStatus(access, subscriptionActive),
    [access, subscriptionActive]
  )

  async function handleCheckout() {
    setCheckoutOpening(true)
    setError(null)
    setNotice('Opening secure checkout…')
    try {
      const url = await startOrbCheckout()
      window.location.href = url
    } catch {
      setNotice(null)
      setError(
        stripeReady
          ? 'Checkout could not be started. Try again in a moment.'
          : 'Stripe is not configured yet. Subscription checkout will be available once billing is enabled.'
      )
    } finally {
      setCheckoutOpening(false)
    }
  }

  async function handlePortal() {
    setLoading(true)
    setError(null)
    try {
      const url = await openOrbBillingPortal()
      window.location.href = url
    } catch {
      setError('Manage subscription opens in Stripe when you have an active customer record.')
    } finally {
      setLoading(false)
    }
  }

  async function handleTrial() {
    setLoading(true)
    try {
      await startOrbTrial()
      await loadBilling()
      setNotice('Trial started.')
    } catch {
      setError('Trial could not be started.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSaveCap() {
    setLoading(true)
    setError(null)
    try {
      const pounds = monthlyCapPounds.trim()
      const monthly_cap_pence = pounds ? Math.round(Number(pounds) * 100) : null
      await saveOrbSpendingCap({
        monthly_cap_pence,
        warning_threshold_percent: Math.min(100, Math.max(0, Number(warningPercent) || 80)),
        allow_overage: allowOverage
      })
      setUsage(await fetchOrbUsage())
      setNotice('Spending cap saved.')
    } catch {
      setError('Could not save spending cap.')
    } finally {
      setLoading(false)
    }
  }

  async function handleTopUp(amountPence: number) {
    setLoading(true)
    setError(null)
    try {
      const url = await startOrbTopUpCheckout(amountPence)
      window.location.href = url
    } catch {
      setError(
        stripeReady
          ? 'Top-up checkout could not be started.'
          : 'Top-up requires Stripe to be configured.'
      )
    } finally {
      setLoading(false)
    }
  }

  async function handleRefreshStatus() {
    setRefreshing(true)
    setError(null)
    setNotice('Refreshing account status…')
    try {
      const result = await refreshOrbAccessAfterCheckout({ maxAttempts: 3, delayMs: 800 })
      setAccess(result.access)
      try {
        setUsage(await fetchOrbUsage())
      } catch {
        // keep prior usage
      }
      if (result.confirmed) {
        setNotice('Subscription is active.')
      } else {
        setNotice(
          'Payment may still be processing. If you just paid, wait a moment and refresh again.'
        )
      }
    } catch {
      setError('Could not refresh status. Check your connection and try again.')
      setNotice(null)
    } finally {
      setRefreshing(false)
    }
  }

  const actionBusy = loading || refreshing || checkoutOpening

  return (
    <OrbAppModal
      open={open}
      title="Billing"
      subtitle="ORB Residential — individual subscription and usage."
      onClose={onClose}
      panelId="billing"
      size="wide"
    >
      <div
        className="space-y-5 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:space-y-6 sm:p-6"
        data-orb-billing-modal
      >
        {loading && !access ? (
          <p className="text-sm text-[var(--orb-muted)]" data-orb-billing-loading>
            Loading billing…
          </p>
        ) : null}

        <section className={`${cardClassName()} sm:p-4`} data-orb-billing-plan-card>
          <div className="flex flex-wrap items-start justify-between gap-2 sm:gap-3">
            <div>
              <p className="text-sm font-semibold text-[var(--orb-foreground)] sm:text-base">
                ORB Residential — Individual
              </p>
              <p className="mt-0.5 text-xl font-semibold tracking-tight text-[var(--orb-res-primary,#1677ff)] sm:mt-1 sm:text-2xl">
                £9.99/month
              </p>
            </div>
            <span
              className="rounded-full border border-[var(--orb-res-status-pill-bg,rgba(22,119,255,0.1))] bg-[var(--orb-res-status-pill-bg,rgba(22,119,255,0.1))] px-3 py-1 text-xs font-medium capitalize text-[var(--orb-res-status-pill-text,#1e3a8a)]"
              data-orb-billing-status-pill
            >
              {displayStatus}
            </span>
          </div>
          {!subscriptionActive ? (
            <p
              className="mt-3 rounded-lg border border-[var(--orb-res-info-border,#bfdbfe)] bg-[var(--orb-res-info-bg,#eff6ff)] px-3 py-2 text-sm leading-5 text-[var(--orb-res-info-text,#1e3a8a)]"
              data-orb-billing-inactive
            >
              Start ORB Residential — £9.99/month includes chat, dictate, voice, documents, templates and saved
              outputs.
            </p>
          ) : null}
          <p
            className="mt-3 text-xs leading-5 text-[var(--orb-muted)]"
            data-orb-standalone-boundary
          >
            ORB Residential is standalone and does not access IndiCare OS records unless your organisation
            connects them.
          </p>
          <ul className="mt-4 grid gap-2 text-sm text-[var(--orb-muted)] sm:grid-cols-2">
            {INDIVIDUAL_PLAN_FEATURES.map((feature) => (
              <li key={feature} className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" aria-hidden />
                {feature}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs leading-5 text-[var(--orb-muted)]">
            Pay with card, Apple Pay or Google Pay in Stripe Checkout when your domain is verified.
          </p>
        </section>

        <section className={cardClassName()} data-orb-billing-trust>
          <h3 className="text-sm font-semibold text-[var(--orb-foreground)]">Trust &amp; data</h3>
          <ul className="mt-2 space-y-1.5 text-xs leading-5 text-[var(--orb-muted)]">
            <li>Providers can control AI settings where organisation features are enabled.</li>
            <li>Prompt and transcript storage is off by default unless enabled.</li>
            <li>ORB supports professional judgement and human review.</li>
            <li>ORB does not replace safeguarding procedures or statutory decision-making.</li>
          </ul>
        </section>

        <section className={cardClassName()} data-orb-billing-provider-team>
          <h3 className="text-sm font-semibold text-[var(--orb-foreground)]">Provider team plans</h3>
          <p className="mt-2 text-sm leading-6 text-[var(--orb-muted)]">
            Need ORB for a provider team? Contact IndiCare — team billing and seat management are coming later.
          </p>
          <a
            href="mailto:support@indicare.co.uk?subject=ORB%20Residential%20provider%20team"
            className="mt-3 inline-block text-sm font-semibold text-[var(--orb-res-primary,#1677ff)]"
            data-orb-billing-provider-cta
          >
            Contact IndiCare
          </a>
        </section>

        <section className={cardClassName()} data-orb-billing-status>
          <h3 className="text-sm font-semibold text-[var(--orb-foreground)]">Subscription</h3>
          <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-[var(--orb-muted)]">Status</dt>
              <dd className="mt-0.5 font-medium capitalize" data-orb-billing-subscription-status>
                {displayStatus}
              </dd>
            </div>
            {access?.subscription?.current_period_end ? (
              <div>
                <dt className="text-[var(--orb-muted)]">Renews</dt>
                <dd className="mt-0.5 font-medium">
                  {String(access.subscription.current_period_end).slice(0, 10)}
                </dd>
              </div>
            ) : null}
            {access?.trial?.active ? (
              <div>
                <dt className="text-[var(--orb-muted)]">Trial</dt>
                <dd className="mt-0.5 font-medium">
                  Active
                  {access.trial.days_left != null ? ` · ${access.trial.days_left} days left` : ''}
                </dd>
              </div>
            ) : null}
            <div>
              <dt className="text-[var(--orb-muted)]">Payment</dt>
              <dd className="mt-0.5 font-medium">{stripeReady ? 'Stripe ready' : 'Setup required'}</dd>
            </div>
          </dl>
        </section>

        <section className={cardClassName()} data-orb-billing-usage>
          <h3 className="text-sm font-semibold text-[var(--orb-foreground)]">Usage</h3>
          <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-[var(--orb-muted)]">Messages this period</dt>
              <dd className="mt-0.5 font-medium">{usage?.messages_this_period ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-[var(--orb-muted)]">Included allowance</dt>
              <dd className="mt-0.5 font-medium">
                {usage?.included_messages != null ? usage.included_messages : 'Plan allowance'}
              </dd>
            </div>
            <div>
              <dt className="text-[var(--orb-muted)]">Credits balance</dt>
              <dd className="mt-0.5 font-medium">
                {usage?.credits_balance != null
                  ? `£${(usage.credits_balance / 100).toFixed(2)}`
                  : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-[var(--orb-muted)]">Estimated spend</dt>
              <dd className="mt-0.5 font-medium">
                {usage?.estimated_spend_pence != null
                  ? `£${(usage.estimated_spend_pence / 100).toFixed(2)}`
                  : '—'}
              </dd>
            </div>
          </dl>
        </section>

        <section className={cardClassName()} data-orb-billing-spending-cap>
          <h3 className="text-sm font-semibold text-[var(--orb-foreground)]">Spending cap</h3>
          <p className="mt-1 text-sm leading-6 text-[var(--orb-muted)]">
            Set a monthly cap for additional usage beyond your plan allowance.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <label className="block text-xs text-[var(--orb-muted)] sm:col-span-1">
              Monthly cap (£)
              <input
                type="number"
                min={0}
                value={monthlyCapPounds}
                onChange={(e) => setMonthlyCapPounds(e.target.value)}
                placeholder="e.g. 10"
                className="mt-1 w-full rounded-xl border border-[var(--orb-line)] bg-[var(--orb-surface-elevated)] px-3 py-2.5 text-sm text-[var(--orb-foreground)]"
                disabled={actionBusy}
              />
            </label>
            <label className="block text-xs text-[var(--orb-muted)]">
              Warning at (%)
              <input
                type="number"
                min={0}
                max={100}
                value={warningPercent}
                onChange={(e) => setWarningPercent(e.target.value)}
                className="mt-1 w-full rounded-xl border border-[var(--orb-line)] bg-[var(--orb-surface-elevated)] px-3 py-2.5 text-sm text-[var(--orb-foreground)]"
                disabled={actionBusy}
              />
            </label>
            <label className="flex items-end gap-2 pb-2 text-sm text-[var(--orb-foreground)]">
              <input
                type="checkbox"
                checked={allowOverage}
                onChange={(e) => setAllowOverage(e.target.checked)}
                className="rounded border-[var(--orb-line)]"
                disabled={actionBusy}
              />
              Allow overage
            </label>
          </div>
          <button
            type="button"
            disabled={actionBusy}
            onClick={() => void handleSaveCap()}
            className="mt-4 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2.5 text-sm font-semibold text-cyan-100 disabled:opacity-50"
            data-orb-billing-save-cap
          >
            Save cap
          </button>
        </section>

        <section className={cardClassName()} data-orb-billing-buy-more>
          <h3 className="text-sm font-semibold text-[var(--orb-foreground)]">Buy more</h3>
          <p className="mt-1 text-sm leading-6 text-[var(--orb-muted)]">
            Top up with extra usage credits via Stripe Checkout — card, Apple Pay or Google Pay where supported.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {TOP_UP_OPTIONS.map((option) => (
              <button
                key={option.pence}
                type="button"
                disabled={actionBusy || !stripeReady}
                onClick={() => void handleTopUp(option.pence)}
                className="rounded-xl border border-[var(--orb-line)] bg-[var(--orb-surface-elevated)] px-4 py-2.5 text-sm font-semibold hover:border-cyan-500/40 disabled:opacity-50"
                data-orb-billing-topup={option.pence}
              >
                {option.label}
              </button>
            ))}
          </div>
          <p className="mt-3 flex items-center gap-2 text-xs text-[var(--orb-muted)]">
            <Wallet className="h-3.5 w-3.5" aria-hidden />
            Buy credits
          </p>
        </section>

        {notice ? (
          <p className="text-sm text-[var(--orb-res-info-text,#1e3a8a)]" data-orb-billing-notice>
            {notice}
          </p>
        ) : null}
        {error ? (
          <p
            className="rounded-lg border border-[var(--orb-res-warning-border,#fbbf24)] bg-[var(--orb-res-warning-bg,#fffbeb)] px-3 py-2 text-sm text-[var(--orb-res-warning-text,#92400e)]"
            data-orb-billing-error
          >
            {error}
          </p>
        ) : null}

        <div
          className="sticky bottom-0 z-10 flex flex-wrap items-stretch gap-2.5 border-t border-[var(--orb-mobile-ws-card-border,var(--orb-line))] bg-[var(--orb-mobile-ws-footer,var(--orb-surface))]/98 px-1 pb-[max(0.875rem,env(safe-area-inset-bottom))] pt-4 backdrop-blur-md sm:gap-3 sm:px-0"
          data-orb-billing-cta-bar
        >
          {!access?.can_use_orb && access?.trial?.available ? (
            <button
              type="button"
              disabled={actionBusy}
              onClick={() => void handleTrial()}
              className="min-h-11 min-w-0 flex-1 basis-full rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 sm:flex-none sm:basis-auto"
              data-orb-billing-trial
            >
              {loading ? 'Starting trial…' : 'Start free trial'}
            </button>
          ) : null}
          {!access?.subscription?.active && !access?.trial?.active ? (
            <button
              type="button"
              disabled={actionBusy || !stripeReady}
              onClick={() => void handleCheckout()}
              className="min-h-11 min-w-0 flex-1 basis-full rounded-xl bg-gradient-to-r from-[#168bff] to-[#0d5fcc] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 sm:flex-none sm:basis-auto"
              data-orb-billing-upgrade
            >
              {checkoutOpening ? 'Opening checkout…' : 'Subscribe · £9.99/month'}
            </button>
          ) : (
            <button
              type="button"
              disabled={actionBusy || !stripeReady}
              onClick={() => void handlePortal()}
              className="inline-flex min-h-11 min-w-0 flex-1 basis-full items-center justify-center gap-2 rounded-xl border border-[var(--orb-line)] px-4 py-2.5 text-sm font-semibold disabled:opacity-50 sm:flex-none sm:basis-auto"
              data-orb-billing-portal
            >
              <CreditCard className="h-4 w-4 shrink-0" aria-hidden />
              <span className="truncate">Manage subscription</span>
            </button>
          )}
          <button
            type="button"
            disabled={actionBusy}
            onClick={() => void handleRefreshStatus()}
            className="inline-flex min-h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-xl border border-[var(--orb-line)] px-4 py-2.5 text-sm font-semibold disabled:opacity-50 sm:flex-none sm:basis-auto"
            data-orb-billing-refresh
          >
            <RefreshCw className={`h-4 w-4 shrink-0 ${refreshing ? 'animate-spin' : ''}`} aria-hidden />
            <span className="truncate">{refreshing ? 'Refreshing…' : 'Refresh status'}</span>
          </button>
        </div>

        {!stripeReady ? (
          <p className="text-xs leading-5 text-[var(--orb-muted)]" data-orb-billing-stripe-fallback>
            Stripe environment variables are not configured. Subscribe and top-up actions stay disabled until
            production setup is complete.
          </p>
        ) : null}

        <OrbLegalLinks
          className="justify-start pt-2 text-xs"
          linkClassName="font-semibold text-[var(--orb-res-primary,#1677ff)] hover:underline"
          testId="orb-billing-legal-links"
        />
      </div>
    </OrbAppModal>
  )
}
