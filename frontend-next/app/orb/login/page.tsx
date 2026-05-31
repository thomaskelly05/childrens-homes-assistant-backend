import type { Metadata } from 'next'

import { OrbLoginScreen } from '@/components/orb-residential/orb-login-screen'

export const metadata: Metadata = {
  title: 'Sign in · ORB Residential',
  description: 'Sign in to ORB Residential — powered by IndiCare Intelligence.'
}

export default function OrbLoginPage() {
  return <OrbLoginScreen />
}
