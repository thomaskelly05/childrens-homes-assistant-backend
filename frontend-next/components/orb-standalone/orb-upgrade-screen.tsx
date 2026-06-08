'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { CreditCard, Lock, Sparkles } from 'lucide-react'

import { getOrbBillingDisplayStatus } from '@/lib/orb/orb-billing-display'
import {
  fetchOrbAccess,
  openOrbBillingPortal,
  startOrbCheckout,
  startOrbTrial,
  trackOrbAnalytics,
  type OrbAccessPayload
} from '@/lib/orb/orb-billing-client'
import { orbSwitchAccountLoginUrl } from '@/lib/orb/orb-switch-account'
import { buildOrbFrontDoorUrl } from '@/lib/orb/orb-front-door-routing'
import { useAuth } from '@/contexts/auth-context'

function resolveAccessHeadline(
  authenticated: boolean,
  email: string | null | undefined,
  access: OrbAccessPayload | null,
  billingDisplay: ReturnType<typeof getOrbBillingDisplayStatus>
): string {
  if (!authenticated) {
    return 'Sign in or create an account to access ORB Residential.'
  }
  if (billingDisplay.isPaidActive) {
    return 'Your ORB Residential subscription is active.'
  }
  if (access?.trial?.active) {
    return `You're signed in as ${email || 'your account'}. Your ORB Residential trial is active.`
  }
  if (email) {
    return `You're signed in as ${email}. This account does not currently have an active ORB Residential subscription.`
  }
  return "You're signed in, but this account does not currently have an active ORB Residential subscription."
}

export function OrbUpgradeScreen({ initialAccess = null }: { initialAccess?: OrbAccessPayload | null }) {
  const { status, logout, user } = useAuth()
  const [access, setAccess] = useState<OrbAccessPayload | null>(initialAccess)
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const authenticated = status === 'authenticated'
  const userEmail = user?.email ?? null

  useEffect(() => {
    trackOrbAnalytics('locked_screen_viewed')
    if (initialAccess) {
      setAccess(initialAccess)
      return
    }
    fetchOrbAccess()
      .then(setAccess)
      .catch(() => setAccess(null))
  }, [initialAccess])

  async function handleTrial() {
    setLoading('trial')
    setError(null)
    try {
      trackOrbAnalytics('upgrade_clicked', { action: 'trial' })
      await startOrbTrial()
      window.location.href = '/orb/setup'
    } catch {
      setError('Could not start trial. Sign in and try again.')
    } finally {
      setLoading(null)
    }
  }

  async function handleSubscribe() {
    setLoading('checkout')
    setError(null)
    try {
      trackOrbAnalytics('upgrade_clicked', { action: 'subscribe' })
      const url = await startOrbCheckout(
        `${window.location.origin}/orb/billing/success`,
        `${window.location.origin}/orb/billing/cancel`
      )
      window.location.href = url
    } catch {
      setError('Checkout is not available right now. Please try again shortly or contact support.')
    } finally {
      setLoading(null)
    }
  }

  async function handlePortal() {
    setLoading('portal')
    setError(null)
    try {
      const url = await openOrbBillingPortal()
      window.location.href = url
    } catch {
      setError('Billing portal is not available right now. Please try again shortly or contact support.')
    } finally {
      setLoading(null)
    }
  }

  async function handleSwitchAccount() {
    setLoading('switch')
    setError(null)
    try {
      await logout()
      window.location.href = orbSwitchAccountLoginUrl('/orb')
    } catch {
      setError('Could not switch account. Please try again.')
      setLoading(null)
    }
  }

  const upgrade = access?.upgrade
  const stripeReady = Boolean(access?.billing?.stripe_configured && upgrade?.checkout_available)
  const billingDisplay = getOrbBillingDisplayStatus(access)
  const signedInProvider = user?.auth_provider ?? null
  const accessState = access?.access_state ?? null
  const headline = resolveAccessHeadline(authenticated, userEmail, access, billingDisplay)
  const showDuplicateProviderGuidance =
    authenticated && !billingDisplay.isPaidActive && !access?.trial?.active
  const showTrialOrUpgrade =
    authenticated &&
    !billingDisplay.isPaidActive &&
    !access?.trial?.active &&
    (access?.trial?.available || billingDisplay.showUpgrade || billingDisplay.showTrialCta)

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#E0E7FF,transparent_42%),radial-gradient(circle_at_top_right,#F5D0FE,transparent_38%),linear-gradient(180deg,#F8FAFC,#FFFFFF)] px-6 py-12 text-slate-950">
      <div className="mx-auto max-w-3xl">
        <div className="rounded-[2rem] border border-white/80 bg-white/90 p-8 shadow-2xl shadow-indigo-100/60 backdrop-blur">
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-indigo-700">
              <Lock className="h-4 w-4" aria-hidden />
              ORB Residential access
            </span>
            {billingDisplay.isPaidActive ? (
              <span
                className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800"
                data-orb-billing-status-pill
              >
                Active
              </span>
            ) : billingDisplay.showTrialChip && billingDisplay.trialChipLabel ? (
              <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700" data-orb-billing-trial-chip>
                {billingDisplay.trialChipLabel}
              </span>
            ) : null}
          </div>

          <h1 className="text-3xl font-black tracking-tight text-slate-950 md:text-4xl" data-orb-upgrade-title>
            {billingDisplay.isPaidActive ? 'ORB Residential' : 'Access ORB Residential'}
          </h1>
          <p className="mt-4 text-sm leading-7 text-slate-700" data-orb-upgrade-account-status>
            {headline}
          </p>

          {authenticated && userEmail ? (
            <p className="mt-2 text-sm font-medium text-indigo-800" data-orb-upgrade-signed-in-email>
              Signed in as {userEmail}
            </p>
          ) : null}

          {authenticated ? (
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-600">
              {signedInProvider ? (
                <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold" data-orb-upgrade-signed-in-provider>
                  Signed in with {signedInProvider}
                </span>
              ) : null}
              {accessState ? (
                <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold" data-orb-upgrade-access-state>
                  Access state: {accessState}
                </span>
              ) : null}
            </div>
          ) : null}

          {showDuplicateProviderGuidance ? (
            <p
              className="mt-3 rounded-2xl border border-indigo-100 bg-indigo-50/80 px-4 py-3 text-sm leading-6 text-indigo-950"
              data-orb-upgrade-duplicate-provider-guidance
            >
              Already subscribed using Google or Microsoft? Switch account and sign in with the original method you
              used when subscribing.
            </p>
          ) : null}

          {!billingDisplay.isPaidActive ? (
            <>
              <p className="mt-3 text-lg font-semibold text-indigo-700" data-orb-upgrade-price>
                {access?.price_label ?? '£9.99/month'}
              </p>
              <p className="mt-3 text-sm leading-7 text-slate-600" data-orb-upgrade-includes>
                ORB Residential helps adults in and around children&apos;s homes record, reflect and respond with
                safeguarding-aware AI support. Includes chat, dictate, voice, documents, templates and saved outputs.
              </p>
            </>
          ) : null}

          {access?.access_state === 'subscription_past_due' || access?.subscription?.status === 'past_due' ? (
            <p className="mt-3 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900" data-orb-upgrade-past-due>
              Your subscription payment is past due. Update billing to restore full ORB access.
            </p>
          ) : null}
          {access?.access_state === 'subscription_cancelled' ? (
            <p className="mt-3 rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-800" data-orb-upgrade-cancelled>
              Your subscription has been cancelled. Subscribe again to restore ORB access when your paid period ends.
            </p>
          ) : null}
          {access?.trial?.active === false && access?.trial?.available === false && !access?.can_use_orb ? (
            <p className="mt-3 text-sm text-slate-600">Trial expired — subscribe to continue using ORB Residential.</p>
          ) : null}

          {!billingDisplay.isPaidActive ? (
            <ul className="mt-8 grid gap-2 text-sm text-slate-700 sm:grid-cols-2" data-orb-upgrade-features>
              {(upgrade?.features ?? [
                "Residential children's homes assistant",
                'Safeguarding thinking',
                'Recording support',
                'Ofsted / Reg 44 lens',
                'Shift Builder',
                'Document intelligence',
                'Academy / NVQ helper',
                'Profile and voice',
                'Feedback-driven improvement'
              ]).map((feature) => (
                <li key={feature} className="flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2">
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" aria-hidden />
                  {feature}
                </li>
              ))}
            </ul>
          ) : null}

          {error ? <p className="mt-6 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</p> : null}

          <div className="mt-8 flex flex-wrap gap-3" data-orb-upgrade-actions>
            {billingDisplay.isPaidActive ? (
              <Link
                href="/orb"
                className="rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-lg"
                data-orb-return-to-orb
              >
                Return to ORB
              </Link>
            ) : showTrialOrUpgrade && billingDisplay.showTrialCta ? (
              <button
                type="button"
                onClick={handleTrial}
                disabled={!authenticated || loading !== null}
                className="rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-lg disabled:opacity-50"
                data-orb-start-trial
              >
                {loading === 'trial' ? 'Starting trial…' : 'Start 7-day trial'}
              </button>
            ) : showTrialOrUpgrade && billingDisplay.showUpgrade ? (
              <button
                type="button"
                onClick={handleSubscribe}
                disabled={!stripeReady || loading !== null}
                className="rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
                data-orb-subscribe
                data-orb-billing-upgrade
                title={stripeReady ? undefined : 'Checkout unavailable'}
              >
                {loading === 'checkout' ? 'Opening checkout…' : 'Upgrade · £9.99/month'}
              </button>
            ) : !authenticated ? (
              <Link
                href={buildOrbFrontDoorUrl('/orb/billing')}
                className="rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-lg"
                data-orb-upgrade-sign-in
              >
                Sign in
              </Link>
            ) : null}

            {(billingDisplay.showManageBilling || upgrade?.manage_billing_available) && authenticated ? (
              <button
                type="button"
                onClick={handlePortal}
                disabled={loading !== null}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700"
                data-orb-manage-billing
              >
                <CreditCard className="h-4 w-4" aria-hidden />
                Manage billing
              </button>
            ) : null}

            {authenticated ? (
              <button
                type="button"
                onClick={() => void handleSwitchAccount()}
                disabled={loading !== null}
                className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 disabled:opacity-50"
                data-orb-switch-account
              >
                {loading === 'switch' ? 'Switching account…' : 'Switch account'}
              </button>
            ) : null}

            <button
              type="button"
              onClick={() => {
                setLoading('refresh')
                setError(null)
                void fetchOrbAccess()
                  .then(setAccess)
                  .catch(() => setError('Could not refresh status. Try again.'))
                  .finally(() => setLoading(null))
              }}
              disabled={loading !== null}
              className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 disabled:opacity-50"
              data-orb-billing-refresh
            >
              {loading === 'refresh' ? 'Refreshing…' : 'Refresh status'}
            </button>

            <Link
              href="/orb"
              className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700"
              data-orb-return-to-orb
            >
              Return to ORB
            </Link>
          </div>

          {stripeReady && !billingDisplay.isPaidActive ? (
            <p className="mt-4 text-xs leading-6 text-slate-600" data-orb-checkout-payment-methods>
              Pay securely by card, Apple Pay or Google Pay where available via Stripe Checkout.
            </p>
          ) : null}

          {!stripeReady && !billingDisplay.isPaidActive ? (
            <p className="mt-4 text-xs text-slate-600" data-orb-stripe-dev-note>
              Checkout is not available right now. Please try again shortly or contact support.
            </p>
          ) : null}

          <p className="mt-8 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-xs leading-6 text-slate-600" data-orb-standalone-boundary>
            ORB Residential does not access IndiCare OS records. It uses your profile, conversation, uploaded
            documents and IndiCare residential intelligence.
          </p>
        </div>
      </div>
    </main>
  )
}
