import type { Metadata } from 'next'

import { OrbTemplatesScreen } from '@/components/orb-residential/orb-templates-screen'

export const metadata: Metadata = {
  title: 'Templates · ORB Residential',
  description: 'ORB template library for children\'s homes.'
}

export default function OrbTemplatesPage() {
  return <OrbTemplatesScreen />
}
