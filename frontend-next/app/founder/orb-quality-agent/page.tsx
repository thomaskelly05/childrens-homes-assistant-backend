import { FounderGuard } from '@/components/founder/founder-guard'
import { FounderOrbQualityAgentPage } from '@/components/founder/founder-orb-quality-agent-page'

export default function OrbQualityAgentRoute() {
  return (
    <FounderGuard>
      <FounderOrbQualityAgentPage />
    </FounderGuard>
  )
}
