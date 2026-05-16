import Link from 'next/link'
import { notFound } from 'next/navigation'

import { OperationalLifecyclePanel } from '@/components/indicare/operational-lifecycle-panel'
import { Card, PageHeader } from '@/components/indicare/ui'
import { StaffOperationalWorkspace } from '@/components/operations/staff-workspace'
import { fullName, getStaffById } from '@/lib/indicare/selectors'
import { deriveLifecycleState } from '@/lib/lifecycle/selectors'

export default async function StaffDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const member = getStaffById(id)
  if (!member) notFound()
  const lifecycle = deriveLifecycleState({ ...member, id, title: fullName(member), type: 'staff_member', status: 'active', review_notes: `${member.role}. ${member.shiftPattern}` }, 'staff_member')

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Staff operational workspace"
        title={fullName(member)}
        description={`${member.role}. ${member.shiftPattern}. ${member.email} · ${member.phone}`}
        action={<Link href={`/staff/${id}/recording`} className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-500/30">Open recording</Link>}
      />
      <Card>
        <OperationalLifecyclePanel
          title="Staff member lifecycle"
          description="Practice, handover and recording oversight stays review-led and avoids protected HR detail."
          items={[lifecycle]}
        />
      </Card>
      <StaffOperationalWorkspace staffId={id} />
    </div>
  )
}
