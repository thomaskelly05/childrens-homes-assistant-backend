'use client'

import { useEffect, useState } from 'react'

import { fetchOrbResidential } from '@/lib/orb-residential-api'

export default function OrbResidentialAccessPage() {
  const [access, setAccess] = useState<Record<string, unknown> | null>(null)

  useEffect(() => {
    fetchOrbResidential<{ data: { access?: Record<string, unknown> } }>('/orb/residential/access')
      .then((payload) => setAccess(payload.data?.access || null))
      .catch(() => setAccess(null))
  }, [])

  const canUse = Boolean(access?.can_use_orb)

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Premium access</h1>
      <div className="rounded-xl border border-[#E5E7EB] bg-white p-4 text-sm">
        <p className="font-medium">ORB Residential — £9.99 per user per month</p>
        <p className="mt-2 text-[#6B7280]">
          {canUse ? 'Your access is active.' : 'Subscribe or start a 7-day trial to unlock the full product.'}
        </p>
        {access ? (
          <pre className="mt-3 overflow-x-auto rounded-lg bg-[#F9FAFB] p-2 text-xs">{JSON.stringify(access, null, 2)}</pre>
        ) : (
          <p className="mt-2 text-[#6B7280]">Sign in to view your access state.</p>
        )}
      </div>
      <a href="/billing/me" className="text-sm text-[#2563EB] underline">
        Manage billing (cards, Apple Pay, Google Pay via Stripe)
      </a>
    </div>
  )
}
