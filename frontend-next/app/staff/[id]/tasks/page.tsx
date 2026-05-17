import { notFound } from 'next/navigation'

import { LiveDataStatus } from '@/components/indicare/live-data-status'
import { Card, EmptyState, PageHeader, SectionHeader } from '@/components/indicare/ui'
import { getStaff } from '@/lib/os-api/platform'

export default async function StaffTasksPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const staffResult = await getStaff()
  const staff = staffResult.data.staff.find((item) => item.id === id)
  if (!staff) notFound()

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Staff tasks" title={`${staff.title} · task queue`} description="Operational task queue, needs-attention items, awaiting review and overdue recording." />
      <LiveDataStatus result={staffResult} />
      <Card>
        <SectionHeader eyebrow="Queue" title="Staff task queue" />
        <EmptyState title="Live staff tasks pending" description="No staff-specific task queue is shown until backed by live OS records." />
      </Card>
    </div>
  )
}
