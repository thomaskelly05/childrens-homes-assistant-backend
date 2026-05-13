import Link from 'next/link'

import { Card, DataTable, EmptyState, PageHeader, SectionHeader, StatusBadge } from '@/components/indicare/ui'
import { indicareData } from '@/lib/indicare/demo-data'
import { fullName } from '@/lib/indicare/selectors'

export default function StaffPage() {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Staff" title="Staff records" description="Workforce profiles linked to assigned young people, logs written, incidents involved in, keywork, appointments, reports and audit activity." />
      <Card>
        <SectionHeader eyebrow="Directory" title="Staff team" />
        <DataTable
          headers={['Name', 'Role', 'Status', 'Qualifications', 'Assigned young people', 'Shift pattern']}
          rows={indicareData.staff.map((member) => [
            <Link key={member.id} href={`/staff/${member.id}`} className="font-black text-slate-950 hover:text-blue-700">{fullName(member)}</Link>,
            member.role,
            <StatusBadge key="status" value={member.status} />,
            member.qualifications.join(', '),
            member.assignedYoungPeople.length,
            member.shiftPattern
          ])}
          empty={<EmptyState title="No staff found" description="No staff records match your current filters." />}
        />
      </Card>
    </div>
  )
}
