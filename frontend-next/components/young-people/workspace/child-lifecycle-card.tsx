import Link from 'next/link'

import { Card, SectionHeader } from '@/components/indicare/ui'
import type { ChildWorkspaceOverviewViewModel } from '@/lib/young-people/child-workspace-normaliser'

export function ChildLifecycleCard({ view }: { view: ChildWorkspaceOverviewViewModel }) {
  const id = view.child.id
  const items = [
    { label: 'Archive', href: view.routes.archive, testId: 'child-lifecycle-archive' },
    { label: 'Story chronology', href: view.routes.chronologyStory, testId: 'child-lifecycle-chronology-story' },
    { label: 'LifeEcho', href: view.routes.lifeecho, testId: 'child-lifecycle-lifeecho' },
    { label: 'Plan impacts', href: view.routes.planImpacts, testId: 'child-lifecycle-plan-impacts' }
  ]

  return (
    <Card data-testid="child-lifecycle-card">
      <SectionHeader
        eyebrow="Signed-off lifecycle"
        title="Archive, story, memories and plans"
        description="Everything formally signed off becomes part of this child's story — reviewable and child-centred."
      />
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            prefetch={false}
            data-testid={item.testId}
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black text-slate-800 transition hover:border-sky-200 hover:bg-sky-50"
          >
            {item.label}
          </Link>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-2 text-xs font-black">
        <Link href={view.routes.archive} data-testid="child-quick-archive" className="text-sky-700">
          Open archive →
        </Link>
        <Link href={view.routes.lifeecho} data-testid="child-quick-lifeecho-upload" className="text-violet-700">
          Add LifeEcho memory →
        </Link>
        <Link href={view.routes.planImpacts} data-testid="child-quick-plan-impacts" className="text-amber-800">
          Review plan impacts →
        </Link>
      </div>
    </Card>
  )
}
