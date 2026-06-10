import { FounderIntelligenceBriefingsPage } from '@/components/founder/founder-intelligence-briefings-page'
import { FounderGuard } from '@/components/founder/founder-guard'

export default function Page() {
  return (
    <FounderGuard>
      <FounderIntelligenceBriefingsPage />
    </FounderGuard>
  )
}
