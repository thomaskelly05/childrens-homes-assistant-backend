import Link from 'next/link'

import { LiveDataStatus } from '@/components/indicare/live-data-status'
import { Card, DataTable, EmptyState, PageHeader, SectionHeader, StatusBadge } from '@/components/indicare/ui'
import { getWorkforceStaff } from '@/lib/os-api/workforce'

export default async function AllStaffPage() {
  const result = await getWorkforceStaff()
  const staff = result.data.staff

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Adults / Staff"
        title="All staff"
        description="Directory entry point for staff profile hubs, workforce evidence and operational links."
        action={<Link href="/staff" className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-lg shadow-slate-950/20">Staff dashboard</Link>}
      />
      <LiveDataStatus result={result} />
      <Card>
        <SectionHeader eyebrow="Directory" title="Staff records" description="Open one central profile for employment, safer recruitment, training, supervision, probation, wellbeing, documents and evidence." />
        <DataTable
          headers={['Name', 'Role', 'Home', 'Status', 'Profile']}
          rows={staff.map((member) => [
            <span key="name" className="font-black text-slate-950">{member.title}</span>,
            member.role || 'Role not returned',
            member.home_id || 'Not returned',
            <StatusBadge key="status" value={member.status || 'active'} />,
            <Link key="profile" href={`/staff/${encodeURIComponent(member.id)}`} className="font-black text-blue-700">Open profile hub</Link>
          ])}
          empty={<EmptyState title="No staff returned" description="The workforce API did not return visible staff for this session." />}
        />
      </Card>
    </div>
  )
}
