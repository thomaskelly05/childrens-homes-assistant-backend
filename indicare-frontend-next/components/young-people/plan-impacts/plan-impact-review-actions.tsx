'use client'

export function PlanImpactReviewActions({ suggestionId }: { suggestionId: string }) {
  return (
    <div data-testid="plan-impact-review-actions" className="flex flex-wrap gap-2">
      <button type="button" className="rounded-xl bg-emerald-700 px-3 py-1.5 text-xs font-black text-white">
        Accept review
      </button>
      <button type="button" className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-black text-slate-700">
        Reject
      </button>
      <button type="button" className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-black text-blue-900">
        Create action
      </button>
      <span className="sr-only">{suggestionId}</span>
    </div>
  )
}
