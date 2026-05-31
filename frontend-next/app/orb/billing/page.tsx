import type { Metadata } from 'next'

import { OrbBillingPage } from '@/components/orb-residential/orb-billing-page'

export const metadata: Metadata = {
  title: 'Trial & billing · ORB Residential',
  description: 'Start your ORB Residential trial or manage subscription.'
}

export default function OrbBillingRoutePage() {
  return <OrbBillingPage />
}
