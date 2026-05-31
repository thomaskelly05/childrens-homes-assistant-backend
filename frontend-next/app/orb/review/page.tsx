import type { Metadata } from 'next'

import { OrbReviewScreen } from '@/components/orb-residential/orb-review-screen'

export const metadata: Metadata = {
  title: 'Review This · ORB Residential',
  description: 'Review records through safeguarding, child voice and Ofsted lenses.'
}

export default function OrbReviewPage() {
  return <OrbReviewScreen />
}
