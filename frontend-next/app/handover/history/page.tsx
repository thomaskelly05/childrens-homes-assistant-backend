import Link from 'next/link'

import { Card, DataTable, EmptyState, PageHeader, SectionHeader, StatusBadge } from '@/components/indicare/ui'
import { handoverHistory } from '@/lib/operations/shift-data'

export default function HandoverHistoryPage() {
  const history = handoverHistory()

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Handover history" title="Signed-off handovers" description="Inspectable continuity between shifts with follow-up summaries and links back to operational context." />
      <Card>
        <SectionHeader eyebrow="History" title="Recent handovers" />
        <DataTable
          headers={['Shift', 'Status', 'Summary', 'Open']}
          rows={history.map((item) => [
            item.shift,
            <StatusBadge key="status" value={item.status} />,
            item.summary,
            <Link key={item.id} href={item.href} className="font-black text-blue-700">Open</Link>
          ])}
          empty={<EmptyState title="No handovers" description="No signed-off handovers match this view." />}
        />
      </Card>
    </div>
  )
}
