import { FounderBriefingPage } from '@/components/founder/founder-briefing-page'
import { FounderGuard } from '@/components/founder/founder-guard'

export default function FounderBriefingRoute() {
  return (
    <FounderGuard>
      <FounderBriefingPage />
    </FounderGuard>
  )
}
