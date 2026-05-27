import { notFound } from 'next/navigation'

import { LiveDataStatus } from '@/components/indicare/live-data-status'
import { Card, EmptyState, PageHeader, SectionHeader } from '@/components/indicare/ui'
import { getStaff } from '@/lib/os-api/platform'

export default async function StaffHandoverPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const staffResult = await getStaff()
  const staff = staffResult.data.staff.find((item) => item.id === id)
  if (!staff) notFound()

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Staff handover" title={`${staff.title} · handover actions`} description="Handover actions assigned to or relevant for this staff member." />
      <LiveDataStatus result={staffResult} />
      <Card>
        <SectionHeader eyebrow="Actions" title="Handover queue" />
        <EmptyState title="Live handover queue pending" description="No handover actions are shown until backed by staff-scoped live OS records." />
      </Card>
    </div>
  )
}
