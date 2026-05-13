import Link from 'next/link'
import { notFound } from 'next/navigation'

import { PageHeader } from '@/components/indicare/ui'
import { StaffOperationalWorkspace } from '@/components/operations/staff-workspace'
import { fullName, getStaffById } from '@/lib/indicare/selectors'

export default async function StaffDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const member = getStaffById(id)
  if (!member) notFound()

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Staff operational workspace"
        title={fullName(member)}
        description={`${member.role}. ${member.shiftPattern}. ${member.email} · ${member.phone}`}
        action={<Link href={`/staff/${id}/recording`} className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-500/30">Open recording</Link>}
      />
      <StaffOperationalWorkspace staffId={id} />
    </div>
  )
}
