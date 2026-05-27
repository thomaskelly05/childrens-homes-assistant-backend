import Link from 'next/link'

import { ChildArchiveLibrary } from '@/components/young-people/archive/child-archive-library'
import { PageHeader } from '@/components/indicare/ui'

export default async function ChildArchivePage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ search?: string; record_type?: string }>
}) {
  const { id } = await params
  const query = await searchParams

  return (
    <div data-testid="child-archive-page" className="space-y-6">
      <PageHeader
        eyebrow="Child archive"
        title="Library of this child's life"
        description="Signed-off records only — safe summaries, filters by date, type and author. Drafts never appear here."
        action={
          <Link
            href={`/young-people/${id}/workspace`}
            data-testid="child-archive-back-workspace"
            className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-700"
          >
            Workspace
          </Link>
        }
      />
      <ChildArchiveLibrary childId={id} search={query.search} recordType={query.record_type} />
    </div>
  )
}
