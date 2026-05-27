import { Card, SectionHeader } from '@/components/indicare/ui'
import type { ChildWorkspaceOverviewViewModel } from '@/lib/young-people/child-workspace-normaliser'

import { ChildWorkspaceEmptyState } from './child-workspace-empty-state'

export function ChildWhatMattersCard({ view }: { view: ChildWorkspaceOverviewViewModel }) {
  const name = view.child.preferredName || view.child.displayName
  const primary = view.whatMatters.find((f) => f.label === 'What matters')
  const hasContent = view.whatMatters.some((f) => f.value && f.value !== view.emptyStates.whatMatters && f.value !== 'Not recorded yet')

  return (
    <Card data-testid="child-what-matters-card">
      <SectionHeader
        eyebrow="Get to know me"
        title={`What matters to ${name}`}
        description="Interests, strengths and what helps this child feel seen."
      />
      {primary && primary.value !== view.emptyStates.whatMatters ? (
        <p className="mb-4 rounded-2xl bg-violet-50/80 px-4 py-4 text-base leading-8 text-slate-800">{primary.value}</p>
      ) : null}
      {hasContent ? (
        <dl className="grid gap-3 sm:grid-cols-2">
          {view.whatMatters
            .filter((f) => f.label !== 'What matters')
            .map((field) => (
              <div key={field.label} className="rounded-2xl border border-violet-100/80 bg-white px-4 py-3">
                <dt className="text-[11px] font-black uppercase tracking-[0.14em] text-violet-500">{field.label}</dt>
                <dd className="mt-1 text-sm font-semibold leading-6 text-slate-800">{field.value}</dd>
              </div>
            ))}
        </dl>
      ) : (
        <ChildWorkspaceEmptyState message={view.emptyStates.whatMatters} />
      )}
    </Card>
  )
}
