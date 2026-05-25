import Link from 'next/link'

import { Card, SectionHeader } from '@/components/indicare/ui'
import type { ChildWorkspaceOverviewViewModel } from '@/lib/young-people/child-workspace-normaliser'

import { ChildWorkspaceEmptyState } from './child-workspace-empty-state'

export function ChildActionsReviewCard({ view }: { view: ChildWorkspaceOverviewViewModel }) {
  return (
    <Card data-testid="child-actions-review-card">
      <SectionHeader eyebrow="Follow-up" title="Actions and reviews" description="Open actions linked to this child." />
      {view.actions.length ? (
        <ul className="space-y-2">
          {view.actions.map((action) => (
            <li key={action.id} className="rounded-2xl border border-slate-100 bg-white px-4 py-3">
              <p className="text-sm font-bold text-slate-900">{action.title}</p>
              <p className="mt-1 text-xs text-slate-500">
                {action.status}
                {action.dueDate ? ` · due ${action.dueDate}` : ''}
                {action.priority ? ` · ${action.priority}` : ''}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <ChildWorkspaceEmptyState message={view.emptyStates.actions} />
      )}
      <div className="mt-4 flex flex-wrap gap-3">
        <Link href={view.routes.actions} prefetch={false} className="text-sm font-black text-sky-700">
          Open actions →
        </Link>
        <Link href="/record/reviews" prefetch={false} className="text-sm font-black text-slate-600">
          Recording reviews →
        </Link>
      </div>
    </Card>
  )
}
