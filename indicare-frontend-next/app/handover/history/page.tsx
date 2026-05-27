import { Card, EmptyState, PageHeader, SectionHeader } from '@/components/indicare/ui'

export default function HandoverHistoryPage() {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Handover history" title="Signed-off handovers" description="Inspectable continuity between shifts with follow-up summaries and links back to operational context." />
      <Card>
        <SectionHeader eyebrow="History" title="Recent handovers" />
        <EmptyState title="Live handover history pending" description="No signed-off handovers are shown until backed by live handover storage." />
      </Card>
    </div>
  )
}
