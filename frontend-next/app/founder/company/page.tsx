import { FounderGuard } from '@/components/founder/founder-guard'
import { FounderCompanyPage } from '@/components/founder/founder-company-page'

export const metadata = {
  title: 'Founder Company Operating Model | IndiCare',
  robots: { index: false, follow: false }
}

export default function Page() {
  return (
    <FounderGuard>
      <FounderCompanyPage />
    </FounderGuard>
  )
}
