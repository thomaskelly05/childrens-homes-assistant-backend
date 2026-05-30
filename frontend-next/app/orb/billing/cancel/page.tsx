'use client'

import Link from 'next/link'
import { useEffect } from 'react'

import { startOrbCheckout, startOrbTrial, trackOrbAnalytics } from '@/lib/orb/orb-billing-client'
import { useAuth } from '@/contexts/auth-context'

export default function OrbBillingCancelPage() {
  const { status } = useAuth()

  useEffect(() => {
    trackOrbAnalytics('checkout_cancelled', { surface: 'billing_cancel' })
  }, [])

  async function tryAgain() {
    if (status !== 'authenticated') {
      window.location.href = '/orb/login?returnUrl=/orb/billing/cancel'
      return
    }
    try {
      const url = await startOrbCheckout(
        `${window.location.origin}/orb/billing/success`,
        `${window.location.origin}/orb/billing/cancel`
      )
      window.location.href = url
    } catch {
      window.location.href = '/orb/access'
    }
  }

  async function startTrial() {
    if (status !== 'authenticated') {
      window.location.href = '/orb/signup'
      return
    }
    try {
      await startOrbTrial()
      window.location.href = '/orb/onboarding'
    } catch {
      window.location.href = '/orb/access'
    }
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#F8FAFC,#FFFFFF)] px-6 py-12 text-slate-950">
      <div className="mx-auto max-w-lg rounded-[2rem] border border-white/80 bg-white/90 p-8 shadow-2xl">
        <h1 className="text-3xl font-black tracking-tight">Checkout cancelled</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          No payment was taken. You can try checkout again or start a trial if one is available on your account.
        </p>
        <p className="mt-4 text-sm font-semibold text-indigo-700">ORB Residential — Powered by IndiCare · £9.99/month</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void tryAgain()}
            className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white"
            data-orb-billing-retry
          >
            Try again
          </button>
          <Link href="/orb" className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700">
            Return to ORB
          </Link>
          {status === 'authenticated' ? (
            <button
              type="button"
              onClick={() => void startTrial()}
              className="rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white"
              data-orb-start-trial-cancel
            >
              Start trial
            </button>
          ) : (
            <Link href="/orb/signup" className="rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white">
              Create account
            </Link>
          )}
        </div>
        <p className="mt-8 text-xs leading-6 text-slate-500">
          ORB Residential does not access IndiCare OS records. Your ORB subscription does not grant IndiCare OS access.
        </p>
      </div>
    </main>
  )
}
