import Link from 'next/link'

import { Card, SectionHeader } from '@/components/indicare/ui'
import type { ChildWorkspaceOverviewViewModel } from '@/lib/young-people/child-workspace-normaliser'

import { ChildWorkspaceEmptyState } from './child-workspace-empty-state'

export function ChildTodayCard({ view }: { view: ChildWorkspaceOverviewViewModel }) {
  const name = view.child.preferredName || view.child.displayName

  return (
    <Card data-testid="child-today-card">
      <SectionHeader eyebrow="Today" title={`Today's picture for ${name}`} description={view.today.summary} />
      <div className="mb-4 flex flex-wrap gap-2">
        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.12em] text-slate-600">
          {view.today.chronologyCount} recent records
        </span>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.12em] text-slate-600">
          {view.today.openActionsCount} open actions
        </span>
      </div>
      {view.today.recentItems.length ? (
        <ul className="space-y-2">
          {view.today.recentItems.map((item) => (
            <li key={item.id} className="rounded-2xl border border-slate-100 bg-white px-4 py-3">
              <p className="text-sm font-bold text-slate-900">{item.title}</p>
              <p className="mt-1 text-xs text-slate-500">{item.when || 'Date not recorded'}</p>
              <p className="mt-1 text-sm leading-6 text-slate-600">{item.summary}</p>
            </li>
          ))}
        </ul>
      ) : (
        <ChildWorkspaceEmptyState message={view.emptyStates.chronology} />
      )}
      {view.today.needsReview.length ? (
        <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50/80 px-4 py-3">
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-amber-800">Needs review</p>
          <ul className="mt-2 space-y-1 text-sm text-amber-900">
            {view.today.needsReview.map((line) => (
              <li key={line}>• {line}</li>
            ))}
          </ul>
        </div>
      ) : null}
      <Link
        href={view.routes.chronology}
        prefetch={false}
        className="mt-4 inline-flex text-sm font-black text-sky-700 hover:text-sky-900"
      >
        Open full chronology →
      </Link>
    </Card>
  )
}
