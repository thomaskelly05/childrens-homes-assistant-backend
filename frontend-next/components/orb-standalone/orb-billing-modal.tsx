'use client'

import { useEffect, useMemo, useState } from 'react'
import { CreditCard, RefreshCw } from 'lucide-react'

import { OrbUserAvatar } from '@/components/orb-residential/orb-user-avatar'
import { OrbLegalLinks } from '@/components/orb-residential/orb-legal-links'
import { OrbAppModal } from '@/components/orb-standalone/orb-app-modal'
import {
  formatOrbPlanLabel,
  getOrbBillingDisplayStatus,
  isPaidSubscriptionActive
} from '@/lib/orb/orb-billing-display'
import {
  fetchOrbAccess,
  fetchOrbBillingMeter,
  openOrbBillingPortal,
  refreshOrbAccessAfterCheckout,
  startOrbCheckout,
  startOrbTrial,
  type OrbAccessPayload
} from '@/lib/orb/orb-billing-client'

function sectionClassName() {
  return 'orb-billing-card rounded-xl border border-[var(--orb-line)]/40 bg-[var(--orb-surface-elevated)]/80 p-3 sm:p-3.5'
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
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [checkoutOpening, setCheckoutOpening] = useState(false)

  async function loadBilling() {
    const [accessPayload, meterPayload] = await Promise.all([
      fetchOrbAccess(),
      fetchOrbBillingMeter().catch(() => null)
    ])
    setAccess(accessPayload)
    setMeter(meterPayload)
  }

  useEffect(() => {
    if (!open) return
    setError(null)
    setNotice(null)
    setLoading(true)
    void loadBilling()
      .catch(() => {
        setError(
          'Checkout is not available right now. Please try again shortly or contact support.'
        )
      })
      .finally(() => setLoading(false))
  }, [open])

  const stripeReady = Boolean(access?.billing?.stripe_configured)
  const display = useMemo(() => getOrbBillingDisplayStatus(access), [access])
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

  async function handleRefreshStatus() {
    setRefreshing(true)
    setError(null)
    setNotice('Refreshing account status…')
    try {
      const result = await refreshOrbAccessAfterCheckout({ maxAttempts: 3, delayMs: 800 })
      setAccess(result.access)
      if (result.meter) setMeter(result.meter)
      else setMeter(await fetchOrbBillingMeter().catch(() => null))
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
        className="space-y-3 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-4"
        data-orb-billing-modal
      >
        {loading && !access ? (
          <p className="text-sm text-[var(--orb-muted)]" data-orb-billing-loading>
            Loading billing…
          </p>
        ) : null}

        <section className={sectionClassName()} data-orb-billing-plan-card>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <OrbUserAvatar name={displayName} avatarUrl={avatarUrl} size="md" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-[var(--orb-foreground)]">
                  {displayName}
                </p>
                {email ? (
                  <p className="truncate text-xs text-[var(--orb-muted)]">{email}</p>
                ) : null}
                <p className="mt-2 text-sm font-semibold text-[var(--orb-foreground)]">{planName}</p>
                <span
                  className={`mt-1.5 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize ${
                    display.isPaidActive
                      ? 'border-emerald-200/40 bg-emerald-500/10 text-emerald-200'
                      : access?.trial?.active
                        ? 'border-sky-200/40 bg-sky-500/10 text-sky-100'
                        : 'border-amber-200/40 bg-amber-500/10 text-amber-100'
                  }`}
                  data-orb-billing-status-pill
                >
                  {display.headline}
                </span>
              </div>
            </div>

            <div className="flex w-full shrink-0 flex-col gap-2 lg:w-auto lg:min-w-[11rem] lg:items-end">
              <p className="text-lg font-semibold tracking-tight text-[var(--orb-res-primary,#1677ff)] lg:text-right">
                {priceLabel}
              </p>
              <div
                className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap lg:flex-col lg:items-stretch"
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

        <section className={sectionClassName()} data-orb-billing-status>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--orb-muted)]">
            Subscription
          </h3>
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
        </section>

        <section className={sectionClassName()} data-orb-billing-usage>
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
          <p className="mt-2 text-[10px] text-[var(--orb-muted)]" data-orb-billing-usage-coming-soon>
            Spending cap and additional usage packs — coming soon.
          </p>
        </section>

        <section className={sectionClassName()} data-orb-billing-trust>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--orb-muted)]">
            Trust &amp; data
          </h3>
          <ul className="mt-1.5 space-y-1 text-[11px] leading-5 text-[var(--orb-muted)]">
            <li>ORB Residential does not access IndiCare OS records.</li>
            <li>
              Uses your profile, conversation, uploaded documents and IndiCare residential intelligence.
            </li>
          </ul>
        </section>

        <section className={sectionClassName()} data-orb-billing-provider-team>
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

        <OrbLegalLinks
          className="justify-start pt-1 text-[10px]"
          linkClassName="font-semibold text-[var(--orb-res-primary,#1677ff)] hover:underline"
          testId="orb-billing-legal-links"
        />
      </div>
    </OrbAppModal>
  )
}
