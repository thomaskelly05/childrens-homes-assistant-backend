import { FounderAgentsPage } from '@/components/founder/founder-agents-page'
import { FounderGuard } from '@/components/founder/founder-guard'

export default function Page() {
  return (
    <FounderGuard>
      <FounderAgentsPage />
    </FounderGuard>
  )
}
