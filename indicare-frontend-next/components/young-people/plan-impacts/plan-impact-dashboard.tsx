import { PlanImpactCard } from '@/components/young-people/plan-impacts/plan-impact-card'
import { PlanImpactReviewActions } from '@/components/young-people/plan-impacts/plan-impact-review-actions'
import { LiveDataStatus } from '@/components/indicare/live-data-status'
import { EmptyState } from '@/components/indicare/ui'
import { fetchPlanImpacts } from '@/lib/os-api/child-lifecycle'

export async function PlanImpactDashboard({ childId }: { childId: string }) {
  const result = await fetchPlanImpacts(childId)
  const suggestions = result.data?.suggestions || []

  return (
    <div data-testid="plan-impact-dashboard" className="space-y-4">
      <LiveDataStatus result={result} />
      {suggestions.length ? (
        suggestions.map((suggestion, index) => (
          <div key={String(suggestion.id || index)} className="space-y-2">
            <PlanImpactCard suggestion={suggestion} childId={childId} />
            <PlanImpactReviewActions suggestionId={String(suggestion.id || '')} />
          </div>
        ))
      ) : (
        <EmptyState
          title="No plan impact suggestions"
          description="Suggestions appear when signed-off records may affect care, health, education or risk plans. Plans are never updated automatically."
        />
      )}
    </div>
  )
}
