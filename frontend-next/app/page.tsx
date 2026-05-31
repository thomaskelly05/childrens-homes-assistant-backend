import type { Metadata } from 'next'

import { OrbFrontDoor } from '@/components/orb-residential/orb-front-door'

export const metadata: Metadata = {
  title: 'ORB Residential',
  description:
    'The professional AI copilot for children\'s homes, powered by IndiCare Intelligence.'
}

/** Canonical app.indicare.co.uk entry — ORB Residential front door. */
export default function HomePage() {
  return <OrbFrontDoor />
}
