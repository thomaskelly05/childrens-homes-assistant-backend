import Link from 'next/link'

import { Card, DataTable, EmptyState, PageHeader, SectionHeader, StatusBadge } from '@/components/indicare/ui'
import { indicareData } from '@/lib/indicare/demo-data'
import { fullName } from '@/lib/indicare/selectors'

export default function StaffPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Staff"
        title="Staff operational workspaces"
        description="Workforce profiles linked to assigned children, live tasks, recording due, safeguarding concerns, handover actions, notifications and QA feedback."
        action={<Link href="/staff/me" className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-500/30">My workspace</Link>}
      />
      <Card>
        <SectionHeader eyebrow="Directory" title="Staff team" />
        <DataTable
          headers={['Name', 'Role', 'Status', 'Assigned young people', 'Shift pattern', 'Queues']}
          rows={indicareData.staff.map((member) => [
            <Link key={member.id} href={`/staff/${member.id}`} className="font-black text-slate-950 hover:text-blue-700">{fullName(member)}</Link>,
            member.role,
            <StatusBadge key="status" value={member.status} />,
            member.assignedYoungPeople.length,
            member.shiftPattern,
            <div key="queues" className="flex flex-wrap gap-2">
              <Link href={`/staff/${member.id}/tasks`} className="font-bold text-blue-700">Tasks</Link>
              <Link href={`/staff/${member.id}/recording`} className="font-bold text-blue-700">Recording</Link>
              <Link href={`/staff/${member.id}/handover`} className="font-bold text-blue-700">Handover</Link>
            </div>
          ])}
          empty={<EmptyState title="No staff found" description="No staff records match your current filters." />}
        />
      </Card>
    </div>
  )
}
