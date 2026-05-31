'use client'

import Link from 'next/link'
import { useEffect } from 'react'

import { OrbUpgradeScreen } from '@/components/orb-standalone/orb-upgrade-screen'
import { OrbShell } from '@/components/orb-residential/ui/orb-shell'

export function OrbBillingPage() {
  useEffect(() => {
    document.documentElement.setAttribute('data-orb-billing-page', '1')
    return () => document.documentElement.removeAttribute('data-orb-billing-page')
  }, [])

  return (
    <div className="min-h-screen bg-[#050b18]" data-orb-billing>
      <OrbShell showOsLink={false}>
        <Link href="/orb" className="text-xs text-slate-500 hover:text-sky-300">
          ← Back to ORB
        </Link>
      </OrbShell>
      <div className="[&_.min-h-screen]:min-h-0 [&_main]:bg-transparent">
        <OrbUpgradeScreen />
      </div>
    </div>
  )
}
