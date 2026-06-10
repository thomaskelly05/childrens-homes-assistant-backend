import { FounderGuard } from '@/components/founder/founder-guard'
import { FounderRevenuePage } from '@/components/founder/founder-revenue-page'

export const metadata = {
  title: 'Founder Revenue Intelligence | IndiCare',
  robots: { index: false, follow: false }
}

export default function Page() {
  return (
    <FounderGuard>
      <FounderRevenuePage />
    </FounderGuard>
  )
}
