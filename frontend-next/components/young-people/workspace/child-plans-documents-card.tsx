import Link from 'next/link'

import { Card, SectionHeader } from '@/components/indicare/ui'
import type { ChildWorkspaceOverviewViewModel } from '@/lib/young-people/child-workspace-normaliser'

import { ChildWorkspaceEmptyState } from './child-workspace-empty-state'

export function ChildPlansDocumentsCard({ view }: { view: ChildWorkspaceOverviewViewModel }) {
  const cards = view.plans.length ? view.plans : view.documents

  return (
    <Card data-testid="child-plans-documents-card">
      <SectionHeader
        eyebrow="Plans"
        title="Plans and documents"
        description="Linked plans and documents — titles and status only, not full extracted text."
      />
      {cards.length ? (
        <ul className="space-y-2">
          {cards.map((card) => (
            <li key={card.id}>
              <Link
                href={card.href || view.routes.documents}
                prefetch={false}
                className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white px-4 py-3 transition hover:border-sky-200 hover:bg-sky-50/50"
              >
                <div>
                  <p className="text-sm font-bold text-slate-900">{card.title}</p>
                  <p className="text-xs text-slate-500">{card.type}</p>
                </div>
                <span className="rounded-full border border-slate-200 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-slate-600">
                  {card.status}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <ChildWorkspaceEmptyState message={view.emptyStates.plans} />
      )}
      <Link href={view.routes.documents} prefetch={false} className="mt-4 inline-flex text-sm font-black text-sky-700">
        Open documents →
      </Link>
    </Card>
  )
}
