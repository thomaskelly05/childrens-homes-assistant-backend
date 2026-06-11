import { FounderGuard } from '@/components/founder/founder-guard'
import { FounderOrbEvaluationRunDetailPage } from '@/components/founder/founder-orb-evaluation-run-detail-page'

export default async function OrbEvaluationRunDetailRoute({
  params
}: {
  params: Promise<{ runId: string }>
}) {
  const { runId } = await params
  return (
    <FounderGuard>
      <FounderOrbEvaluationRunDetailPage runId={runId} />
    </FounderGuard>
  )
}
