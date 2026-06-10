import { FounderGuard } from '@/components/founder/founder-guard'
import { FounderCompanyBoardReportPage } from '@/components/founder/founder-company-board-report-page'

export const metadata = {
  title: 'Board Report | IndiCare Founder',
  robots: { index: false, follow: false }
}

export default function Page() {
  return (
    <FounderGuard>
      <FounderCompanyBoardReportPage />
    </FounderGuard>
  )
}
