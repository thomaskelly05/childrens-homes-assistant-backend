import type { Metadata } from 'next'

import { OrbSetupScreen } from '@/components/orb-residential/orb-setup-screen'

export const metadata: Metadata = {
  title: 'Setup · ORB Residential',
  description: 'Personalise ORB Residential for your role and home.'
}

export default function OrbSetupPage() {
  return <OrbSetupScreen />
}
