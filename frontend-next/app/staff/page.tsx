import Link from 'next/link'

import { LiveDataStatus } from '@/components/indicare/live-data-status'
import { Card, DataTable, EmptyState, PageHeader, SectionHeader, StatCard, StatusBadge } from '@/components/indicare/ui'
import { StaffAccessControls } from '@/components/settings/staff-access-controls'
import { getStaff } from '@/lib/os-api/platform'

export default async function StaffPage() {
  const staffResult = await getStaff()
  const staff = staffResult.data.staff
  const staffStates = staffResult.data.operationalState.states.filter((state) => state.category === 'staff' || state.linkedStaffId).slice(0, 8)
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Staff"
        title="Staff working-life area"
        description="Workforce, practice quality and oversight surfaces. HR and protected information stays permission-safe and is only shown when the backend returns it."
        action={<Link href="/staff/me" className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-500/30">My workspace</Link>}
      />
      <LiveDataStatus result={staffResult} />
      <StaffAccessControls />
      <section className="grid gap-4 md:grid-cols-4">
        <StatCard label="Visible staff" value={staff.length} detail="Returned by workforce/profile routes" />
        <StatCard label="Staff review states" value={staffStates.length} detail="Training, supervision or checks requiring review" />
        <StatCard label="Supervision" value="Route available" detail="/supervision/submissions" />
        <StatCard label="Safer recruitment" value="Restricted" detail="Shown only if backend returns it" />
      </section>
      <Card>
        <SectionHeader eyebrow="Operational states" title="Staff oversight queue" description="Shows staff compliance indicators only when permission-safe backend records expose them." />
        <DataTable
          headers={['Indicator', 'Priority', 'Reason', 'Next action']}
          rows={staffStates.map((state) => [
            state.title,
            <StatusBadge key={state.id} value={state.priority} />,
            state.reason,
            state.nextAction
          ])}
          empty={<EmptyState title="No staff operational states" description="No staff compliance states were returned for this session." />}
        />
      </Card>
      <Card>
        <SectionHeader eyebrow="Directory" title="Staff team" description="This table avoids exposing HR fields unless they are explicitly present in the live response." />
        <DataTable
          headers={['Name', 'Role', 'Status', 'Practice links', 'Protected information']}
          rows={staff.map((member) => [
            <Link key={member.id} href={`/staff/${encodeURIComponent(member.id)}`} className="font-black text-slate-950 hover:text-blue-700">{member.title}</Link>,
            member.raw.role || 'Role not returned',
            <StatusBadge key="status" value={member.status || 'active'} />,
            <div key="queues" className="flex flex-wrap gap-2">
              <Link href={`/staff/${encodeURIComponent(member.id)}/tasks`} className="font-bold text-blue-700">Tasks</Link>
              <Link href={`/staff/${encodeURIComponent(member.id)}/recording`} className="font-bold text-blue-700">Recording</Link>
              <Link href={`/staff/${encodeURIComponent(member.id)}/handover`} className="font-bold text-blue-700">Handover</Link>
            </div>,
            'HR, DBS and safer recruitment data are hidden unless provided by a role-safe backend route.'
          ])}
          empty={<EmptyState title="No staff found" description="No staff records match your current filters." />}
        />
      </Card>
    </div>
  )
}
