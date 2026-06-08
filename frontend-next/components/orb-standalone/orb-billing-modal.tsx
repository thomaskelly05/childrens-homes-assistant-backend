'use client'

import { useEffect, useMemo, useState } from 'react'
import { CreditCard, RefreshCw } from 'lucide-react'

import { OrbUserAvatar } from '@/components/orb-residential/orb-user-avatar'
import { OrbLegalLinks } from '@/components/orb-residential/orb-legal-links'
import { OrbAppModal } from '@/components/orb-standalone/orb-app-modal'
import {
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
  return 'rounded-2xl border border-[var(--orb-line)]/40 bg-[var(--orb-surface-elevated)]/80 p-4 sm:p-5'
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
  const planName = access?.subscription?.plan_name?.trim() || 'ORB Residential — Individual'

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
          ? 'Checkout is not available right now. Please try again shortly or contact support.'
          : 'Checkout is not available right now. Please try again shortly or contact support.'
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
        className="space-y-5 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:space-y-6 sm:p-6"
        data-orb-billing-modal
      >
        {loading && !access ? (
          <p className="text-sm text-[var(--orb-muted)]" data-orb-billing-loading>
            Loading billing…
          </p>
        ) : null}

        <section className={sectionClassName()} data-orb-billing-plan-card>
          <div className="flex items-start gap-3">
            <OrbUserAvatar name={userName || userEmail} avatarUrl={avatarUrl} size="lg" />
            <div className="min-w-0 flex-1">
              {userName || userEmail ? (
                <p className="truncate text-sm font-medium text-[var(--orb-foreground)]">
                  {userName || userEmail}
                </p>
              ) : null}
              <p className="text-base font-semibold text-[var(--orb-foreground)] sm:text-lg">
                ORB Residential — Individual
              </p>
              <p className="mt-1 text-sm text-[var(--orb-muted)]">
                Status:{' '}
                <span className="font-medium capitalize text-[var(--orb-foreground)]" data-orb-billing-status-pill>
                  {display.headline}
                </span>
              </p>
              <p className="mt-1 text-xl font-semibold tracking-tight text-[var(--orb-res-primary,#1677ff)]">
                £9.99/month
              </p>
            </div>
          </div>

          {display.showTrialChip && display.trialChipLabel ? (
            <p className="mt-3 text-xs text-[var(--orb-muted)]" data-orb-billing-trial-chip>
              {display.trialChipLabel}
            </p>
          ) : null}

          {!display.isPaidActive && !access?.trial?.active && access?.trial?.available === false ? (
            <p
              className="mt-3 rounded-lg border border-[var(--orb-res-warning-border,#fbbf24)] bg-[var(--orb-res-warning-bg,#fffbeb)] px-3 py-2 text-sm text-[var(--orb-res-warning-text,#92400e)]"
              data-orb-billing-inactive
            >
              Trial ended — upgrade to continue using ORB Residential.
            </p>
          ) : null}

          <p className="mt-3 text-xs leading-5 text-[var(--orb-muted)]" data-orb-standalone-boundary>
            ORB Residential is billed separately from IndiCare OS.
          </p>
          <p className="mt-3 text-xs leading-5 text-[var(--orb-muted)]">
            Manage your payment method, invoices and subscription settings securely in Stripe.
          </p>

          <div className="mt-4 flex flex-wrap gap-2" data-orb-billing-cta-bar>
            {display.showTrialCta ? (
              <button
                type="button"
                disabled={actionBusy}
                onClick={() => void handleTrial()}
                className="min-h-10 rounded-xl bg-cyan-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
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
                className="min-h-10 rounded-xl bg-gradient-to-r from-[#168bff] to-[#0d5fcc] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
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
                className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--orb-line)] px-4 py-2 text-sm font-semibold disabled:opacity-50"
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
              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--orb-line)] px-4 py-2 text-sm font-semibold disabled:opacity-50"
              data-orb-billing-refresh
            >
              <RefreshCw className={`h-4 w-4 shrink-0 ${refreshing ? 'animate-spin' : ''}`} aria-hidden />
              Refresh status
            </button>
          </div>
        </section>

        <section className={sectionClassName()} data-orb-billing-status>
          <h3 className="text-sm font-semibold text-[var(--orb-foreground)]">Subscription</h3>
          <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
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
            {access?.subscription?.current_period_end ? (
              <div>
                <dt className="text-[var(--orb-muted)]">Current period ends</dt>
                <dd className="mt-0.5 font-medium">
                  {String(access.subscription.current_period_end).slice(0, 10)}
                </dd>
              </div>
            ) : null}
          </dl>
          <p className="mt-3 text-xs leading-5 text-[var(--orb-muted)]">
            Subscription changes, payment methods and invoices are managed securely in Stripe.
          </p>
        </section>

        <section className={sectionClassName()} data-orb-billing-usage>
          <h3 className="text-sm font-semibold text-[var(--orb-foreground)]">Usage</h3>
          <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
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
          <p className="mt-3 text-xs text-[var(--orb-muted)]" data-orb-billing-usage-coming-soon>
            Additional usage packs — coming soon.
          </p>
        </section>

        <section className={sectionClassName()} data-orb-billing-trust>
          <h3 className="text-sm font-semibold text-[var(--orb-foreground)]">Trust &amp; data</h3>
          <ul className="mt-2 space-y-1.5 text-xs leading-5 text-[var(--orb-muted)]">
            <li>ORB Residential does not access IndiCare OS records.</li>
            <li>
              It uses your profile, conversation, uploaded documents and IndiCare residential intelligence.
            </li>
          </ul>
        </section>

        <section className={sectionClassName()} data-orb-billing-provider-team>
          <h3 className="text-sm font-semibold text-[var(--orb-foreground)]">Provider team plans</h3>
          <p className="mt-2 text-sm leading-6 text-[var(--orb-muted)]">
            Team billing and seat management for provider organisations — speak to us when you are ready.
          </p>
          <p className="mt-2 text-xs font-medium uppercase tracking-wide text-[var(--orb-muted)]">Coming soon</p>
          <a
            href="mailto:support@indicare.co.uk?subject=ORB%20Residential%20provider%20team"
            className="mt-3 inline-block text-sm font-semibold text-[var(--orb-res-primary,#1677ff)]"
            data-orb-billing-provider-cta
          >
            Speak to us
          </a>
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

        <OrbLegalLinks
          className="justify-start pt-2 text-xs"
          linkClassName="font-semibold text-[var(--orb-res-primary,#1677ff)] hover:underline"
          testId="orb-billing-legal-links"
        />
      </div>
    </OrbAppModal>
  )
}
