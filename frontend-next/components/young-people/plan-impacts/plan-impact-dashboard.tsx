import { PlanImpactCard } from '@/components/young-people/plan-impacts/plan-impact-card'
import { PlanImpactReviewActions } from '@/components/young-people/plan-impacts/plan-impact-review-actions'
import { LiveDataStatus } from '@/components/indicare/live-data-status'
import { EmptyState } from '@/components/indicare/ui'
import { fetchPlanImpacts } from '@/lib/os-api/child-lifecycle'
import { GET_TO_KNOW_ME_PLAN_SET } from '@/lib/care-planning/get-to-know-me-summary'

export async function PlanImpactDashboard({ childId }: { childId: string }) {
  const result = await fetchPlanImpacts(childId)
  const suggestions = result.data?.suggestions || []

  return (
    <div data-testid="plan-impact-dashboard" className="space-y-5">
      <LiveDataStatus result={result} />

      <section data-testid="get-to-know-me-plan-set" className="rounded-[28px] border border-blue-100 bg-gradient-to-br from-blue-50/90 via-white to-cyan-50/60 p-5 shadow-sm">
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-blue-700">Get to Know Me</p>
        <h2 className="mt-2 text-2xl font-black tracking-[-0.05em] text-slate-950">Living plans for this child</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          These are the blank plan areas every child should have from referral/admission. Records and referral information should feed the right area as suggestions, then wait for manager review before anything becomes a live plan update.
        </p>
        <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {GET_TO_KNOW_ME_PLAN_SET.map((plan) => (
            <article key={plan.id} className="rounded-2xl border border-white/80 bg-white/85 p-4 shadow-sm">
              <p className="text-sm font-black text-slate-950">{plan.label}</p>
              <p className="mt-1 text-xs font-semibold leading-5 text-slate-600">{plan.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section data-testid="get-to-know-me-plan-suggestions" className="space-y-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-amber-700">Awaiting review</p>
          <h2 className="mt-1 text-xl font-black tracking-[-0.04em] text-slate-950">Suggested updates from records</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">Accept, reject or create an action — plans are never updated silently.</p>
        </div>
        {suggestions.length ? (
          suggestions.map((suggestion, index) => (
            <div key={String(suggestion.id || index)} className="space-y-2">
              <PlanImpactCard suggestion={suggestion} childId={childId} />
              <PlanImpactReviewActions suggestionId={String(suggestion.id || '')} />
            </div>
          ))
        ) : (
          <EmptyState
            title="No suggested plan updates waiting"
            description="When signed-off records affect the child’s Get to Know Me plans, suggestions will appear here for manager review."
          />
        )}
      </section>
    </div>
  )
}
