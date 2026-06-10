import { FounderGuard } from '@/components/founder/founder-guard'
import { FounderRevenueForecastPage } from '@/components/founder/founder-revenue-forecast-page'

export const metadata = {
  title: 'Revenue Forecast | Founder | IndiCare',
  robots: { index: false, follow: false }
}

export default function Page() {
  return (
    <FounderGuard>
      <FounderRevenueForecastPage />
    </FounderGuard>
  )
}
