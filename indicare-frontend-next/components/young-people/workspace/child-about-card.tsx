import { Card, SectionHeader } from '@/components/indicare/ui'
import type { ChildWorkspaceOverviewViewModel } from '@/lib/young-people/child-workspace-normaliser'

import { ChildWorkspaceEmptyState } from './child-workspace-empty-state'

export function ChildAboutCard({ view }: { view: ChildWorkspaceOverviewViewModel }) {
  const name = view.child.preferredName || view.child.displayName
  const hasContent = view.about.some((field) => field.value && field.value !== 'Not recorded yet')

  return (
    <Card data-testid="child-about-card">
      <SectionHeader eyebrow="About" title={`About ${name}`} description="Who this child is and how they are placed in the home." />
      {hasContent ? (
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          {view.about.map((field) => (
            <div key={field.label} className="rounded-2xl border border-slate-100 bg-slate-50/60 px-4 py-3">
              <dt className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">{field.label}</dt>
              <dd className="mt-1 text-sm font-semibold leading-6 text-slate-800">{field.value}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <ChildWorkspaceEmptyState message="Basic profile details have not been recorded yet." />
      )}
    </Card>
  )
}
