import { FounderEvidencePage } from '@/components/founder/founder-evidence-page'
import { FounderGuard } from '@/components/founder/founder-guard'

export default function EvidencePage() {
  return (
    <FounderGuard>
      <FounderEvidencePage />
    </FounderGuard>
  )
}
