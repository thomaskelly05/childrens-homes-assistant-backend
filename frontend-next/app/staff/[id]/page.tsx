import Link from 'next/link'
import { notFound } from 'next/navigation'

import { LiveDataStatus } from '@/components/indicare/live-data-status'
import { OperationalLifecyclePanel } from '@/components/indicare/operational-lifecycle-panel'
import { Card, EmptyState, PageHeader } from '@/components/indicare/ui'
import { getStaff } from '@/lib/os-api/platform'

export default async function StaffDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const staffResult = await getStaff()
  const member = staffResult.data.staff.find((item) => item.id === id)
  if (!member) notFound()

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Staff operational workspace"
        title={member.title}
        description={member.summary}
        action={<Link href={`/staff/${id}/recording`} className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-500/30">Open recording</Link>}
      />
      <LiveDataStatus result={staffResult} />
      <Card>
        <OperationalLifecyclePanel
          title="Staff member lifecycle"
          description="Practice, handover and recording oversight stays review-led and avoids protected HR detail."
          items={[member.lifecycle]}
        />
      </Card>
      <Card>
        <EmptyState title="Live staff workspace pending" description="Task, recording and handover queues are hidden until backed by staff-scoped live OS records." />
      </Card>
    </div>
  )
}
