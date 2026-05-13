import Link from 'next/link'

import { LiveDataStatus } from '@/components/indicare/live-data-status'
import { Card, DataTable, EmptyState, PageHeader, RiskBadge, SectionHeader, StatusBadge } from '@/components/indicare/ui'
import { getStaffById } from '@/lib/indicare/selectors'
import { getOsYoungPeople } from '@/lib/os-api/workspaces'
import { routeToYoungPersonWorkspace } from '@/lib/routes/os-routes'

export default async function YoungPeoplePage() {
  const peopleResult = await getOsYoungPeople()
  const rows = peopleResult.data.map((person) => {
    const keyWorker = person.keyWorkerId ? getStaffById(person.keyWorkerId) : undefined

    return [
      <Link key="name" href={routeToYoungPersonWorkspace(person.id)} className="font-black text-slate-950 hover:text-blue-700">{person.displayName}<span className="block text-xs font-bold text-slate-400">Preferred: {person.preferredName || person.displayName}</span></Link>,
      person.age || 'Unknown',
      person.placementStatus || 'No placement',
      <RiskBadge key="risk" value={(person.riskLevel || 'medium') as 'low' | 'medium' | 'high' | 'critical'} />,
      keyWorker ? `${keyWorker.firstName} ${keyWorker.lastName}` : person.keyWorkerId || 'Unallocated',
      <Link key="chronology" href={`/young-people/${person.id}/chronology`} className="font-bold text-blue-700">Open chronology</Link>,
      <Link key="workspace" href={routeToYoungPersonWorkspace(person.id)} className="font-bold text-blue-700">Open workspace</Link>,
      <StatusBadge key="status" value={person.status || person.placementStatus || 'active'} />
    ]
  })

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Young people"
        title="Young person records"
        description="Searchable, joined-up records connecting placement, risk, safeguarding, logs, incidents, medication, keywork, appointments, documents, reports and audit activity."
        action={<Link href="/daily-logs" className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-500/30">+ Add recording</Link>}
      />
      <LiveDataStatus result={peopleResult} />

      <Card>
        <SectionHeader eyebrow="Directory" title="All young people" description="Filters: risk level, status and placement can be layered into this table without changing the data contract." />
        <DataTable
          headers={['Name', 'Age', 'Placement', 'Risk', 'Key worker', 'Chronology', 'Workspace', 'Status']}
          rows={rows}
          empty={<EmptyState title="No young people found" description="No young people found. Try changing filters or add a new record." />}
        />
      </Card>
    </div>
  )
}
