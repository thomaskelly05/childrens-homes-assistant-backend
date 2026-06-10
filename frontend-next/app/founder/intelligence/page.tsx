import { FounderIntelligencePage } from '@/components/founder/founder-intelligence-page'
import { FounderGuard } from '@/components/founder/founder-guard'

export default function Page() {
  return (
    <FounderGuard>
      <FounderIntelligencePage />
    </FounderGuard>
  )
}
