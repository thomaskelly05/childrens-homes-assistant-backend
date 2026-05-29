'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, RefreshCw } from 'lucide-react'

import { refreshOrbAccessAfterCheckout, trackOrbAnalytics, type OrbAccessPayload } from '@/lib/orb/orb-billing-client'
import { useAuth } from '@/contexts/auth-context'

export default function OrbBillingSuccessPage() {
  const router = useRouter()
  const { refreshSession, status } = useAuth()
  const [access, setAccess] = useState<OrbAccessPayload | null>(null)
  const [phase, setPhase] = useState<'confirming' | 'ready' | 'pending'>('confirming')
  const [refreshing, setRefreshing] = useState(false)

  async function runRefresh() {
    setRefreshing(true)
    setPhase('confirming')
    try {
      if (status === 'authenticated') {
        await refreshSession()
      }
      const result = await refreshOrbAccessAfterCheckout()
      setAccess(result.access)
      setPhase(result.confirmed ? 'ready' : 'pending')
      if (result.confirmed) {
        trackOrbAnalytics('checkout_completed')
      }
    } catch {
      setPhase('pending')
    } finally {
      setRefreshing(false)
    }
  }

  useEffect(() => {
    trackOrbAnalytics('checkout_completed', { surface: 'billing_success' })
    void runRefresh()
  }, [])

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#F8FAFC,#EEF2FF)] px-6 py-12 text-slate-950">
      <div className="mx-auto max-w-lg rounded-[2rem] border border-white/80 bg-white/90 p-8 shadow-2xl">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-emerald-800">
          <CheckCircle2 className="h-4 w-4" aria-hidden />
          Payment received
        </div>
        <h1 className="text-3xl font-black tracking-tight">Thank you</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Your ORB Residential subscription is being confirmed. This usually takes a few seconds after checkout.
        </p>
        <p className="mt-4 text-sm font-medium text-indigo-700">
          {phase === 'confirming'
            ? 'Payment received, setting up your access…'
            : phase === 'ready'
              ? 'Your ORB Residential access is ready.'
              : 'Still confirming — use refresh if access has not updated yet.'}
        </p>
        {access ? (
          <p className="mt-2 text-xs text-slate-500">
            Status: {access.subscription?.status ?? access.access_state} · {access.price_label ?? '£9.99/month'}
          </p>
        ) : null}
        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void runRefresh()}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 disabled:opacity-50"
            data-orb-billing-refresh
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} aria-hidden />
            Refresh status
          </button>
          <button
            type="button"
            onClick={() => router.replace('/orb')}
            className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white"
            data-orb-continue-to-orb
          >
            Continue to ORB
          </button>
          <Link href="/orb/access" className="rounded-2xl px-5 py-3 text-sm font-semibold text-indigo-700">
            View access
          </Link>
        </div>
        <p className="mt-8 text-xs leading-6 text-slate-500">
          ORB Residential — Powered by IndiCare. Standalone ORB does not access IndiCare OS child, home, staff,
          chronology or care records.
        </p>
      </div>
    </main>
  )
}
