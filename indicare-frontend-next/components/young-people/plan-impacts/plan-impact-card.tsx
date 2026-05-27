import Link from 'next/link'

export function PlanImpactCard({
  suggestion,
  childId
}: {
  suggestion: Record<string, unknown>
  childId: string
}) {
  const route = suggestion.route ? String(suggestion.route) : `/young-people/${childId}/plans`
  return (
    <article data-testid="plan-impact-card" className="rounded-[24px] border border-amber-100 bg-amber-50/30 p-5">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-800">
        {String(suggestion.suggested_plan_type || 'plan')} · {String(suggestion.status || 'suggested')}
      </p>
      <h3 className="mt-2 text-lg font-black text-slate-950">{String(suggestion.title || 'Plan impact')}</h3>
      <p className="mt-2 text-sm leading-7 text-slate-600">{String(suggestion.safe_summary || '')}</p>
      <p className="mt-2 text-sm text-slate-700">{String(suggestion.suggested_update || '')}</p>
      <div className="mt-4 flex flex-wrap gap-2 text-xs font-black">
        <span className="rounded-xl border border-slate-200 px-3 py-1.5 text-slate-600">Accept / reject in review panel</span>
        <Link href={route} className="rounded-xl bg-slate-950 px-3 py-1.5 text-white">
          Open plan route
        </Link>
        {suggestion.archive_record_id ? (
          <Link href={`/young-people/${childId}/archive`} className="rounded-xl border border-slate-200 px-3 py-1.5 text-slate-700">
            Archive evidence
          </Link>
        ) : null}
      </div>
    </article>
  )
}
