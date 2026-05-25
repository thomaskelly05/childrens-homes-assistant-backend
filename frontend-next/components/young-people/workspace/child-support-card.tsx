import { Card, SectionHeader } from '@/components/indicare/ui'
import type { ChildWorkspaceOverviewViewModel } from '@/lib/young-people/child-workspace-normaliser'

import { ChildWorkspaceEmptyState } from './child-workspace-empty-state'

export function ChildSupportCard({ view }: { view: ChildWorkspaceOverviewViewModel }) {
  const name = view.child.preferredName || view.child.displayName
  const hasContent = view.support.some((f) => f.value && f.value !== view.emptyStates.support && f.value !== 'Not recorded yet')

  return (
    <Card data-testid="child-support-card">
      <SectionHeader
        eyebrow="Support"
        title={`How best to support ${name}`}
        description="Communication, sensory needs and what helps adults respond well."
      />
      {hasContent ? (
        <dl className="grid gap-3 sm:grid-cols-2">
          {view.support.map((field) => (
            <div key={field.label} className="rounded-2xl border border-emerald-100/80 bg-emerald-50/30 px-4 py-3">
              <dt className="text-[11px] font-black uppercase tracking-[0.14em] text-emerald-700">{field.label}</dt>
              <dd className="mt-1 text-sm font-semibold leading-6 text-slate-800">{field.value}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <ChildWorkspaceEmptyState message={view.emptyStates.support} />
      )}
    </Card>
  )
}
