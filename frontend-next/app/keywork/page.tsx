import Link from 'next/link'

import { LiveDataStatus } from '@/components/indicare/live-data-status'
import { Card, DataTable, EmptyState, PageHeader, SectionHeader, StatCard } from '@/components/indicare/ui'
import { getOsChronology } from '@/lib/os-api/chronology'

export default async function KeyworkPage() {
  const keyworkResult = await getOsChronology({ sourceType: 'keywork' })
  const sessions = keyworkResult.data

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Keywork" title="Keywork and direct work" description="Keywork sessions by young person, goals, discussion, young person voice, actions and next session dates." action={<Link href="/chronology" className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-500/30">Open chronology</Link>} />
      <LiveDataStatus result={keyworkResult} />
      <section className="grid gap-4 md:grid-cols-3">
        <StatCard label="Sessions" value={sessions.length} />
        <StatCard label="Actions linked" value={sessions.filter((session) => session.actionIds.length).length} />
        <StatCard label="Evidence linked" value={sessions.filter((session) => session.evidenceIds.length).length} />
      </section>
      <Card>
        <SectionHeader eyebrow="Sessions" title="Keywork list" />
        <DataTable
          headers={['Date', 'Young person', 'Staff', 'Topic', 'Summary', 'Evidence', 'Actions']}
          rows={sessions.map((session) => [
            session.dateTime,
            session.youngPersonIds[0] ? <Link key={session.id} href={`/young-people/${session.youngPersonIds[0]}`} className="font-bold text-blue-700">Child {session.youngPersonIds[0]}</Link> : 'Home-wide',
            session.staffIds[0] || 'Not recorded',
            <Link key={session.id} href={`/keywork/${session.sourceId || session.id}`} className="font-black text-slate-950 hover:text-blue-700">{session.title}</Link>,
            session.summary,
            session.evidenceIds.length,
            session.actionIds.length
          ])}
          empty={<EmptyState title="No keywork sessions" description="No keywork sessions match your current filters." />}
        />
      </Card>
    </div>
  )
}
