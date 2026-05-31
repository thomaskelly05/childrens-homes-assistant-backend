import type { Metadata } from 'next'

import { OrbSavedScreen } from '@/components/orb-residential/orb-saved-screen'

export const metadata: Metadata = {
  title: 'Saved Outputs · ORB Residential',
  description: 'Your saved ORB reviews, templates and learning.'
}

export default function OrbSavedPage() {
  return <OrbSavedScreen />
}
