'use client'

import Link from 'next/link'
import { useEffect } from 'react'

import { OrbAuthGate } from '@/components/orb-residential/orb-auth-gate'
import { OrbUpgradeScreen } from '@/components/orb-standalone/orb-upgrade-screen'

export function OrbBillingPage() {
  useEffect(() => {
    document.documentElement.setAttribute('data-orb-billing-page', '1')
    return () => document.documentElement.removeAttribute('data-orb-billing-page')
  }, [])

  return (
    <OrbAuthGate mode="billing">
      <div data-orb-billing>
        <OrbUpgradeScreen />
      </div>
    </OrbAuthGate>
  )
}
