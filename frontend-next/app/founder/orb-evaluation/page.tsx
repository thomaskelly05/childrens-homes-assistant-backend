import { FounderGuard } from '@/components/founder/founder-guard'
import { FounderOrbEvaluationPage } from '@/components/founder/founder-orb-evaluation-page'

export default function OrbEvaluationRoute() {
  return (
    <FounderGuard>
      <FounderOrbEvaluationPage />
    </FounderGuard>
  )
}
