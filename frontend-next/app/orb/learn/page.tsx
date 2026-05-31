import type { Metadata } from 'next'

import { OrbLearnScreen } from '@/components/orb-residential/orb-learn-screen'

export const metadata: Metadata = {
  title: 'ORB Learn · ORB Residential',
  description: 'Micro-learning sessions from ORB guidance.'
}

export default function OrbLearnPage() {
  return <OrbLearnScreen />
}
