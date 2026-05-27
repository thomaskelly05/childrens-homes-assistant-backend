import Link from 'next/link'

import { Card, RiskBadge, SectionHeader } from '@/components/indicare/ui'
import type { ChildWorkspaceOverviewViewModel } from '@/lib/young-people/child-workspace-normaliser'

export function ChildRiskSafeguardingCard({ view }: { view: ChildWorkspaceOverviewViewModel }) {
  const name = view.child.preferredName || view.child.displayName

  return (
    <Card data-testid="child-risk-safeguarding-card">
      <SectionHeader
        eyebrow="Safety"
        title="Safeguarding and risk"
        description={`Summary-level safeguarding context for ${name} — not full concern narratives.`}
      />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <RiskBadge value={(view.safeguarding.riskLevel as 'low' | 'medium' | 'high') || 'medium'} />
        {view.safeguarding.activeConcernCount > 0 ? (
          <span className="rounded-full border border-red-100 bg-red-50 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.12em] text-red-700">
            {view.safeguarding.activeConcernCount} active concern{view.safeguarding.activeConcernCount === 1 ? '' : 's'}
          </span>
        ) : null}
      </div>
      <p className="text-sm leading-7 text-slate-700">{view.safeguarding.summary}</p>
      <dl className="mt-4 grid gap-3 sm:grid-cols-3">
        {view.safeguarding.fields.map((field) => (
          <div key={field.label} className="rounded-2xl border border-slate-100 bg-slate-50/60 px-4 py-3">
            <dt className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">{field.label}</dt>
            <dd className="mt-1 text-sm font-semibold text-slate-800">{field.value}</dd>
          </div>
        ))}
      </dl>
      <Link
        href={view.routes.safeguarding}
        prefetch={false}
        className="mt-4 inline-flex rounded-2xl border border-red-100 bg-red-50 px-4 py-2 text-sm font-black text-red-800"
      >
        Record safeguarding concern
      </Link>
    </Card>
  )
}
