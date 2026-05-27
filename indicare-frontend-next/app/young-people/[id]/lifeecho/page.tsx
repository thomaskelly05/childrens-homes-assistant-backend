import Link from 'next/link'

import { LifeEchoMemoryBoard } from '@/components/young-people/lifeecho/lifeecho-memory-board'
import { PageHeader } from '@/components/indicare/ui'

export default async function ChildLifeEchoWorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  return (
    <div data-testid="child-lifeecho-page" className="space-y-6">
      <PageHeader
        eyebrow="LifeEcho"
        title="Memories and life story"
        description="Child-centred memories, photos and achievements. Suggestions from positive signed-off records require adult approval."
        action={
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/young-people/${id}/workspace`}
              data-testid="child-lifeecho-back-workspace"
              className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-700"
            >
              Child workspace
            </Link>
            <Link href={`/young-people/${id}/archive`} className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-700">
              Archive
            </Link>
          </div>
        }
      />
      <LifeEchoMemoryBoard childId={id} />
    </div>
  )
}
