import { HandoverWorkspace } from '@/components/handover/handover-workspace'
import { PageHeader } from '@/components/indicare/ui'

export default async function ChildHandoverPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const childId = Number(id)

  return (
    <div data-testid="child-handover-page" className="mx-auto max-w-[1400px] space-y-6 px-4 py-8 sm:px-6">
      <PageHeader
        eyebrow="Handover"
        title="Shift handover for this child"
        description="Story-first handover intelligence, drafts and manager review links scoped to this young person."
      />
      <HandoverWorkspace childId={Number.isFinite(childId) ? childId : undefined} />
    </div>
  )
}
