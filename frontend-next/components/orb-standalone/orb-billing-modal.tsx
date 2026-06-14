'use client'

import { useEffect, useMemo, useState } from 'react'
import { CreditCard, RefreshCw, Wallet } from 'lucide-react'

import { OrbUserAvatar } from '@/components/orb-residential/orb-user-avatar'
import { OrbLegalLinks } from '@/components/orb-residential/orb-legal-links'
import { OrbAppModal } from '@/components/orb-standalone/orb-app-modal'
import {
  ORB_RESIDENTIAL_BILLING_TRUST_COPY,
  ORB_RESIDENTIAL_BILLING_VALUE_ITEMS,
  ORB_RESIDENTIAL_BILLING_VALUE_SUMMARY
} from '@/lib/orb/orb-residential-copy'
import {
  formatOrbPlanLabel,
  getOrbBillingDisplayStatus,
  isPaidSubscriptionActive
} from '@/lib/orb/orb-billing-display'
import {
  fetchOrbAccess,
  fetchOrbBillingMeter,
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

function sectionClassName(compact = false) {
  if (compact) {
    return 'orb-billing-card orb-billing-card--flat orb-liquid-card rounded-lg border-0 border-b border-[var(--orb-line)]/25 bg-transparent p-0 pb-2.5 sm:rounded-xl sm:border sm:border-[var(--orb-mobile-ws-card-border,var(--orb-line))]/30 sm:bg-[var(--orb-mobile-ws-card,var(--orb-surface-elevated))]/60 sm:p-3.5'
  }
  return 'orb-billing-card orb-mobile-workspace-card orb-liquid-card rounded-lg border border-[var(--orb-mobile-ws-card-border,var(--orb-line))]/30 bg-[var(--orb-mobile-ws-card,var(--orb-surface-elevated))]/60 p-2.5 sm:rounded-xl sm:p-3.5'
}

export function OrbBillingModal({
  open,
  onClose,
  userName,
  userEmail,
  avatarUrl
}: {
  open: boolean
  onClose: () => void
  userName?: string | null
  userEmail?: string | null
  avatarUrl?: string | null
}) {
  const [access, setAccess] = useState<OrbAccessPayload | null>(null)
  const [meter, setMeter] = useState<Record<string, unknown> | null>(null)
  const [usage, setUsage] = useState<OrbUsageSummary | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [checkoutOpening, setCheckoutOpening] = useState(false)
  const [loadFailed, setLoadFailed] = useState(false)
  const [monthlyCapPounds, setMonthlyCapPounds] = useState('')
  const [warningPercent, setWarningPercent] = useState('80')
  const [allowOverage, setAllowOverage] = useState(false)

  async function loadBilling() {
    const [accessPayload, meterPayload, usagePayload] = await Promise.all([
      fetchOrbAccess(),
      fetchOrbBillingMeter().catch(() => null),
      fetchOrbUsage().catch(() => null)
    ])
    setAccess(accessPayload)
    setMeter(meterPayload)
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
    setLoadFailed(false)
    setLoading(true)
    void loadBilling()
      .catch(() => {
        setLoadFailed(true)
        setError(
          'Checkout is not available right now. Please try again shortly or contact support.'
        )
      })
      .finally(() => setLoading(false))
  }, [open])

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
  const planName = formatOrbPlanLabel(access?.subscription?.plan_name)
  const displayName = userName?.trim() || userEmail?.trim() || 'Your account'
  const email = userEmail?.trim() || null
  const priceLabel = access?.price_label ?? '£9.99/month'

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
        'Checkout is not available right now. Please try again shortly or contact support.'
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
      setError(
        'Billing portal is not available right now. Please try again shortly or contact support.'
      )
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
      if (result.meter) setMeter(result.meter)
      else setMeter(await fetchOrbBillingMeter().catch(() => null))
      try {
        setUsage(await fetchOrbUsage())
      } catch {
        // keep prior usage
      }
      if (result.confirmed || isPaidSubscriptionActive(result.access)) {
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
  const usageRequests = meter?.total_requests != null ? String(meter.total_requests) : '0'
  const showMobileStickyActions =
    !loadFailed &&
    (display.showTrialCta || display.showUpgrade || display.showManageBilling)

  return (
    <OrbAppModal
      open={open}
      title="Billing"
      subtitle="ORB Residential — Individual"
      onClose={onClose}
      panelId="billing"
      size="wide"
      mobileMode="full"
    >
      <div
        className="space-y-2 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:space-y-3 sm:p-4"
        data-orb-billing-modal
        data-orb-billing-mobile-layout="compact"
        data-orb-billing-desktop-layout="sheet"
      >
        {loading && !access ? (
          <p className="text-sm text-[var(--orb-muted)]" data-orb-billing-loading>
            Loading billing…
          </p>
        ) : null}

        <div
          className="flex items-center justify-between gap-3 border-b border-[var(--orb-line)]/25 pb-2.5 sm:hidden"
          data-orb-billing-status-row
        >
          <span
            className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${
              display.isPaidActive
                ? 'border-emerald-400/40 bg-emerald-500/12 text-emerald-700'
                : access?.trial?.active
                  ? 'border-sky-300/40 bg-sky-500/12 text-sky-800'
                  : 'border-amber-300/40 bg-amber-500/12 text-amber-800'
            }`}
            data-orb-billing-status-pill
            data-orb-billing-status-kind={display.statusKind}
          >
            {display.headline}
          </span>
          <p
            className="text-sm font-semibold tracking-tight text-[var(--orb-res-primary,#1677ff)]"
            data-orb-billing-price-row
          >
            {priceLabel}
          </p>
        </div>

        <section className={sectionClassName()} data-orb-billing-plan-card>
          <div className="flex flex-col gap-3 sm:flex lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 items-start gap-2.5" data-orb-billing-account>
              <OrbUserAvatar name={displayName} avatarUrl={avatarUrl} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-[var(--orb-foreground)]">
                  {displayName}
                </p>
                {email ? (
                  <p className="truncate text-xs text-[var(--orb-muted)]">{email}</p>
                ) : null}
                <p className="mt-1 hidden text-sm font-medium text-[var(--orb-muted)] sm:block">{planName}</p>
                <span
                  className={`mt-1 hidden rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize sm:inline-flex ${
                    display.isPaidActive
                      ? 'border-emerald-400/50 bg-emerald-500/15 text-emerald-100'
                      : access?.trial?.active
                        ? 'border-sky-300/45 bg-sky-500/15 text-sky-50'
                        : 'border-amber-300/45 bg-amber-500/15 text-amber-50'
                  }`}
                  data-orb-billing-status-pill-desktop
                >
                  {display.headline}
                </span>
              </div>
            </div>

            <div className="flex w-full shrink-0 flex-col gap-2 lg:w-auto lg:min-w-[11rem] lg:items-end">
              <p className="hidden text-base font-semibold tracking-tight text-[var(--orb-res-primary,#1677ff)] sm:block sm:text-lg lg:text-right">
                {priceLabel}
              </p>
              <div
                className={`flex w-full flex-col gap-2 lg:flex-col lg:items-stretch ${showMobileStickyActions ? 'hidden sm:flex' : ''}`}
                data-orb-billing-cta-bar
              >
                {display.showTrialCta ? (
                  <button
                    type="button"
                    disabled={actionBusy}
                    onClick={() => void handleTrial()}
                    className="inline-flex min-h-9 w-full items-center justify-center rounded-xl bg-cyan-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50 sm:flex-1 lg:w-full"
                    data-orb-billing-trial
                  >
                    {loading ? 'Starting trial…' : 'Start free trial'}
                  </button>
                ) : null}
                {display.showUpgrade ? (
                  <button
                    type="button"
                    disabled={actionBusy || !stripeReady}
                    onClick={() => void handleCheckout()}
                    className="inline-flex min-h-9 w-full items-center justify-center rounded-xl bg-gradient-to-r from-[#168bff] to-[#0d5fcc] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50 sm:flex-1 lg:w-full"
                    data-orb-billing-upgrade
                  >
                    {checkoutOpening ? 'Opening checkout…' : 'Upgrade · £9.99/month'}
                  </button>
                ) : null}
                {display.showManageBilling ? (
                  <button
                    type="button"
                    disabled={actionBusy || !stripeReady}
                    onClick={() => void handlePortal()}
                    className="inline-flex min-h-9 w-full items-center justify-center gap-2 rounded-xl border border-[var(--orb-line)] px-3 py-2 text-sm font-semibold disabled:opacity-50 sm:flex-1 lg:w-full"
                    data-orb-billing-portal
                  >
                    <CreditCard className="h-4 w-4 shrink-0" aria-hidden />
                    Manage billing
                  </button>
                ) : null}
                <button
                  type="button"
                  disabled={actionBusy}
                  onClick={() => void handleRefreshStatus()}
                  className="inline-flex min-h-9 w-full items-center justify-center gap-2 rounded-xl border border-[var(--orb-line)] px-3 py-2 text-sm font-semibold disabled:opacity-50 sm:flex-1 lg:w-full"
                  data-orb-billing-refresh
                >
                  <RefreshCw className={`h-4 w-4 shrink-0 ${refreshing ? 'animate-spin' : ''}`} aria-hidden />
                  Refresh status
                </button>
              </div>
            </div>
          </div>

          {!display.isPaidActive && !access?.trial?.active && access?.trial?.available === false ? (
            <p
              className="mt-3 rounded-lg border border-[var(--orb-res-warning-border,#fbbf24)] bg-[var(--orb-res-warning-bg,#fffbeb)] px-3 py-2 text-xs text-[var(--orb-res-warning-text,#92400e)]"
              data-orb-billing-inactive
            >
              Trial ended — upgrade to continue using ORB Residential.
            </p>
          ) : null}
        </section>

        <section className={sectionClassName(true)} data-orb-billing-status>
          <details className="group" data-orb-billing-collapsible="subscription">
            <summary className="cursor-pointer list-none text-xs font-semibold uppercase tracking-wide text-[var(--orb-muted)] [&::-webkit-details-marker]:hidden">
              Subscription details
            </summary>
            <dl className="mt-2 grid gap-2 text-xs sm:grid-cols-2">
              <div>
                <dt className="text-[var(--orb-muted)]">Plan</dt>
                <dd className="mt-0.5 font-medium">{planName}</dd>
              </div>
              <div>
                <dt className="text-[var(--orb-muted)]">Status</dt>
                <dd className="mt-0.5 font-medium capitalize" data-orb-billing-subscription-status>
                  {display.subscriptionLabel}
                </dd>
              </div>
              <div>
                <dt className="text-[var(--orb-muted)]">Billing</dt>
                <dd className="mt-0.5 font-medium">{priceLabel}</dd>
              </div>
              <div>
                <dt className="text-[var(--orb-muted)]">Managed by</dt>
                <dd className="mt-0.5 font-medium">Stripe</dd>
              </div>
              {access?.subscription?.current_period_end ? (
                <div className="sm:col-span-2">
                  <dt className="text-[var(--orb-muted)]">Current period ends</dt>
                  <dd className="mt-0.5 font-medium">
                    {String(access.subscription.current_period_end).slice(0, 10)}
                  </dd>
                </div>
              ) : null}
            </dl>
          </details>
        </section>

        <section className={`${sectionClassName(true)} hidden sm:block`} data-orb-billing-usage>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--orb-muted)]">Usage</h3>
          <dl className="mt-2 grid gap-2 text-xs sm:grid-cols-2">
            <div>
              <dt className="text-[var(--orb-muted)]">Usage this period</dt>
              <dd className="mt-0.5 font-medium">{usageRequests} requests</dd>
            </div>
            {meter?.soft_limit_warning ? (
              <div>
                <dt className="text-[var(--orb-muted)]">Usage note</dt>
                <dd className="mt-0.5 font-medium text-amber-700">{String(meter.soft_limit_warning)}</dd>
              </div>
            ) : null}
          </dl>
        </section>

        <section className={sectionClassName(true)} data-orb-billing-spending-cap>
          <details className="group sm:open" data-orb-billing-collapsible="spending-cap">
            <summary className="cursor-pointer list-none text-xs font-semibold uppercase tracking-wide text-[var(--orb-muted)] sm:cursor-default sm:[&::-webkit-details-marker]:hidden [&::-webkit-details-marker]:hidden">
              Spending cap
            </summary>
            <p className="mt-1.5 text-xs leading-5 text-[var(--orb-muted)]">
              Set a monthly cap for additional usage beyond your plan allowance.
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <label className="block text-xs text-[var(--orb-muted)] sm:col-span-1">
                Monthly cap (£)
                <input
                  type="number"
                  min={0}
                  value={monthlyCapPounds}
                  onChange={(e) => setMonthlyCapPounds(e.target.value)}
                  placeholder="e.g. 10"
                  className="mt-1 w-full rounded-xl border border-[var(--orb-line)] bg-[var(--orb-surface-elevated)] px-3 py-2 text-sm text-[var(--orb-foreground)]"
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
                  className="mt-1 w-full rounded-xl border border-[var(--orb-line)] bg-[var(--orb-surface-elevated)] px-3 py-2 text-sm text-[var(--orb-foreground)]"
                  disabled={actionBusy}
                />
              </label>
              <label className="flex items-end gap-2 pb-1 text-sm text-[var(--orb-foreground)]">
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
              className="mt-3 inline-flex min-h-9 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-700 disabled:opacity-50 dark:text-cyan-100"
              data-orb-billing-save-cap
            >
              Save cap
            </button>
            {usage?.estimated_spend_pence != null ? (
              <p className="mt-2 text-[10px] text-[var(--orb-muted)]">
                Estimated spend this period: £{(usage.estimated_spend_pence / 100).toFixed(2)}
              </p>
            ) : null}
          </details>
        </section>

        <section className={sectionClassName(true)} data-orb-billing-buy-more>
          <details className="group sm:open" data-orb-billing-collapsible="buy-more">
            <summary className="cursor-pointer list-none text-xs font-semibold uppercase tracking-wide text-[var(--orb-muted)] sm:cursor-default sm:[&::-webkit-details-marker]:hidden [&::-webkit-details-marker]:hidden">
              Buy more
            </summary>
            <p className="mt-1.5 text-xs leading-5 text-[var(--orb-muted)]">
              Top up with extra usage credits via Stripe Checkout.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {TOP_UP_OPTIONS.map((option) => (
                <button
                  key={option.pence}
                  type="button"
                  disabled={actionBusy || !stripeReady}
                  onClick={() => void handleTopUp(option.pence)}
                  className="rounded-xl border border-[var(--orb-line)] bg-[var(--orb-surface-elevated)] px-4 py-2 text-sm font-semibold hover:border-cyan-500/40 disabled:opacity-50"
                  data-orb-billing-topup={option.pence}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <p className="mt-2 flex items-center gap-2 text-[10px] text-[var(--orb-muted)]">
              <Wallet className="h-3.5 w-3.5 shrink-0" aria-hidden />
              Buy credits
            </p>
          </details>
        </section>

        <section className={sectionClassName()} data-orb-billing-value>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--orb-muted)]">
            What&apos;s included
          </h3>
          <ul
            className="mt-2 space-y-1.5 text-xs leading-5 text-[var(--orb-foreground)] sm:hidden"
            data-orb-billing-included-summary
          >
            {ORB_RESIDENTIAL_BILLING_VALUE_SUMMARY.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="text-[var(--orb-primary)]" aria-hidden>
                  ✓
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <details className="group mt-2 sm:mt-2" data-orb-billing-collapsible="included">
            <summary className="cursor-pointer list-none text-xs font-medium text-[var(--orb-muted)] sm:hidden [&::-webkit-details-marker]:hidden">
              Full included list
            </summary>
            <ul className="mt-2 space-y-1.5 text-xs leading-5 text-[var(--orb-foreground)] sm:mt-2">
              {ORB_RESIDENTIAL_BILLING_VALUE_ITEMS.map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="text-[var(--orb-primary)]" aria-hidden>
                    ✓
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </details>
          <ul className="mt-2 hidden space-y-1.5 text-xs leading-5 text-[var(--orb-foreground)] sm:block" data-orb-billing-plan-features>
            {INDIVIDUAL_PLAN_FEATURES.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="text-[var(--orb-primary)]" aria-hidden>
                  ✓
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className={sectionClassName(true)} data-orb-billing-trust>
          <details className="group" data-orb-billing-collapsible="trust">
            <summary className="cursor-pointer list-none text-xs font-semibold uppercase tracking-wide text-[var(--orb-muted)] [&::-webkit-details-marker]:hidden">
              Trust &amp; data
            </summary>
            <p className="mt-1.5 text-xs leading-5 text-[var(--orb-foreground)]">{ORB_RESIDENTIAL_BILLING_TRUST_COPY}</p>
            <ul className="mt-2 space-y-1 text-[11px] leading-5 text-[var(--orb-muted)]">
              <li>ORB Residential does not access IndiCare OS records.</li>
              <li>
                Uses your profile, conversation, uploaded documents and IndiCare residential intelligence.
              </li>
            </ul>
          </details>
        </section>

        <section className={`${sectionClassName(true)} sm:block`} data-orb-billing-provider-team>
          <details className="group sm:hidden" data-orb-billing-collapsible="provider">
            <summary className="cursor-pointer list-none text-xs font-semibold uppercase tracking-wide text-[var(--orb-muted)] [&::-webkit-details-marker]:hidden">
              Provider team plans
            </summary>
            <p className="mt-1.5 text-xs leading-5 text-[var(--orb-muted)]">
              Team billing and seat management for provider organisations.
            </p>
            <p className="mt-1 text-[10px] font-medium uppercase tracking-wide text-[var(--orb-muted)]">
              Coming soon
            </p>
            <a
              href="mailto:support@indicare.co.uk?subject=ORB%20Residential%20provider%20team"
              className="mt-2 inline-block text-xs font-semibold text-[var(--orb-res-primary,#1677ff)]"
              data-orb-billing-provider-cta
            >
              Speak to us
            </a>
          </details>
          <div className="hidden sm:block">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--orb-muted)]">
              Provider team plans
            </h3>
            <p className="mt-1.5 text-xs leading-5 text-[var(--orb-muted)]">
              Team billing and seat management for provider organisations.
            </p>
            <p className="mt-1 text-[10px] font-medium uppercase tracking-wide text-[var(--orb-muted)]">
              Coming soon
            </p>
            <a
              href="mailto:support@indicare.co.uk?subject=ORB%20Residential%20provider%20team"
              className="mt-2 inline-block text-xs font-semibold text-[var(--orb-res-primary,#1677ff)]"
              data-orb-billing-provider-cta
            >
              Speak to us
            </a>
          </div>
        </section>

        {notice ? (
          <p className="text-xs text-[var(--orb-res-info-text,#1e3a8a)]" data-orb-billing-notice>
            {notice}
          </p>
        ) : null}
        {error ? (
          <p
            className="rounded-lg border border-[var(--orb-res-warning-border,#fbbf24)] bg-[var(--orb-res-warning-bg,#fffbeb)] px-3 py-2 text-xs text-[var(--orb-res-warning-text,#92400e)]"
            data-orb-billing-error
          >
            {error}
          </p>
        ) : null}

        {showMobileStickyActions ? (
          <div
            className="sticky bottom-0 -mx-3 flex flex-col gap-2 border-t border-[var(--orb-line)]/25 bg-[var(--orb-surface-elevated)]/96 px-3 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] backdrop-blur-md sm:hidden"
            data-orb-billing-sticky-footer
          >
            {display.showTrialCta ? (
              <button
                type="button"
                disabled={actionBusy}
                onClick={() => void handleTrial()}
                className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-cyan-600 px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                data-orb-billing-trial
              >
                {loading ? 'Starting trial…' : 'Start free trial'}
              </button>
            ) : null}
            {display.showUpgrade ? (
              <button
                type="button"
                disabled={actionBusy || !stripeReady}
                onClick={() => void handleCheckout()}
                className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-gradient-to-r from-[#168bff] to-[#0d5fcc] px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                data-orb-billing-upgrade
              >
                {checkoutOpening ? 'Opening checkout…' : 'Upgrade · £9.99/month'}
              </button>
            ) : null}
            {display.showManageBilling ? (
              <button
                type="button"
                disabled={actionBusy || !stripeReady}
                onClick={() => void handlePortal()}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[var(--orb-line)] px-3 py-2.5 text-sm font-semibold disabled:opacity-50"
                data-orb-billing-portal
              >
                <CreditCard className="h-4 w-4 shrink-0" aria-hidden />
                Manage billing
              </button>
            ) : null}
          </div>
        ) : null}

        <OrbLegalLinks
          className="justify-start pt-1 text-[10px]"
          linkClassName="font-semibold text-[var(--orb-res-primary,#1677ff)] hover:underline"
          testId="orb-billing-legal-links"
        />
      </div>
    </OrbAppModal>
  )
}
