'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { CreditCard, Lock, Sparkles } from 'lucide-react'

import {
  fetchOrbAccess,
  openOrbBillingPortal,
  startOrbCheckout,
  startOrbTrial,
  trackOrbAnalytics,
  type OrbAccessPayload
} from '@/lib/orb/orb-billing-client'
import { useAuth } from '@/contexts/auth-context'

export function OrbUpgradeScreen({ initialAccess = null }: { initialAccess?: OrbAccessPayload | null }) {
  const { status, logout } = useAuth()
  const [access, setAccess] = useState<OrbAccessPayload | null>(initialAccess)
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

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
      setError('Checkout is unavailable. Stripe may not be configured yet.')
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
      setError('Billing portal unavailable for this account.')
    } finally {
      setLoading(null)
    }
  }

  const upgrade = access?.upgrade
  const stripeReady = Boolean(access?.billing?.stripe_configured && upgrade?.checkout_available)

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#EEF2FF,transparent_40%),linear-gradient(180deg,#F8FAFC,#FFFFFF)] px-6 py-12 text-slate-950">
      <div className="mx-auto max-w-3xl">
        <div className="rounded-[2rem] border border-white/80 bg-white/90 p-8 shadow-2xl shadow-indigo-100/60 backdrop-blur">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-indigo-700">
            <Lock className="h-4 w-4" aria-hidden />
            ORB Residential access
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-950 md:text-4xl" data-orb-upgrade-title>
            {status === 'authenticated' && !access?.can_use_orb
              ? 'Start ORB Residential'
              : access?.product ?? 'ORB Residential — Powered by IndiCare'}
          </h1>
          <p className="mt-3 text-lg font-semibold text-indigo-700" data-orb-upgrade-price>
            {access?.price_label ?? '£9.99/month'}
          </p>
          <p className="mt-4 text-sm leading-7 text-slate-600" data-orb-upgrade-includes>
            Includes ORB chat, dictate, voice, documents, templates and saved outputs. For adults working in or
            around children&apos;s homes. Trial available when eligible.
          </p>
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

          <ul className="mt-8 grid gap-2 text-sm text-slate-700 sm:grid-cols-2" data-orb-upgrade-features>
            {(upgrade?.features ?? [
              'Residential children\'s homes assistant',
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

          {error ? <p className="mt-6 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

          <div className="mt-8 flex flex-wrap gap-3">
            {access?.trial?.available !== false ? (
              <button
                type="button"
                onClick={handleTrial}
                disabled={status !== 'authenticated' || loading !== null}
                className="rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-lg disabled:opacity-50"
                data-orb-start-trial
              >
                {loading === 'trial' ? 'Starting trial…' : 'Start 7-day trial'}
              </button>
            ) : null}
            <button
              type="button"
              onClick={handleSubscribe}
              disabled={!stripeReady || loading !== null}
              className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
              data-orb-subscribe
              title={stripeReady ? undefined : 'Stripe checkout not configured'}
            >
              {loading === 'checkout' ? 'Opening checkout…' : 'Subscribe for £9.99/month'}
            </button>
            {upgrade?.manage_billing_available ? (
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
            <Link href="/orb" className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700">
              Return to ORB
            </Link>
            {status !== 'authenticated' ? (
              <Link href="/orb/login?returnUrl=/orb/billing" className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700">
                Sign in
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => void logout().then(() => { window.location.href = '/orb/login' })}
                className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700"
                data-orb-upgrade-sign-out
              >
                Sign out
              </button>
            )}
          </div>

          {!stripeReady && process.env.NODE_ENV === 'development' ? (
            <p className="mt-4 text-xs text-amber-700" data-orb-stripe-dev-note>
              Admin note: set STRIPE_SECRET_KEY and ORB_RESIDENTIAL_STRIPE_PRICE_ID to enable checkout.
            </p>
          ) : null}

          <p className="mt-8 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-xs leading-6 text-slate-600" data-orb-standalone-boundary>
            ORB Residential does not access IndiCare OS records. It uses your profile, conversation, uploaded documents and IndiCare residential intelligence.
          </p>
        </div>
      </div>
    </main>
  )
}
