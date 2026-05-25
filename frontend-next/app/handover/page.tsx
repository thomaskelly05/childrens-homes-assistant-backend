import { HandoverWorkspace } from '@/components/handover/handover-workspace'

type SearchParams = Promise<{ child_id?: string; draft_id?: string }>

export default async function HandoverPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams
  const childId = params.child_id ? Number(params.child_id) : undefined
  const draftId = params.draft_id

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6">
      <HandoverWorkspace childId={Number.isFinite(childId) ? childId : undefined} draftId={draftId} />
    </div>
  )
}
