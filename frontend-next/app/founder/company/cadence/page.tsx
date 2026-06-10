import { FounderGuard } from '@/components/founder/founder-guard'
import { FounderCompanyCadencePage } from '@/components/founder/founder-company-cadence-page'

export const metadata = {
  title: 'Operating Cadence | IndiCare Founder',
  robots: { index: false, follow: false }
}

export default function Page() {
  return (
    <FounderGuard>
      <FounderCompanyCadencePage />
    </FounderGuard>
  )
}
