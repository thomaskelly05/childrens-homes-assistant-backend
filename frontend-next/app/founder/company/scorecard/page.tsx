import { FounderGuard } from '@/components/founder/founder-guard'
import { FounderCompanyScorecardPage } from '@/components/founder/founder-company-scorecard-page'

export const metadata = {
  title: 'Company Scorecard | IndiCare Founder',
  robots: { index: false, follow: false }
}

export default function Page() {
  return (
    <FounderGuard>
      <FounderCompanyScorecardPage />
    </FounderGuard>
  )
}
