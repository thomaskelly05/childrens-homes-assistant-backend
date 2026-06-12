import { FounderAutonomyPage } from '@/components/founder/founder-autonomy-page'
import { FounderGuard } from '@/components/founder/founder-guard'

export default function FounderAutonomyRoute() {
  return (
    <FounderGuard>
      <FounderAutonomyPage />
    </FounderGuard>
  )
}
