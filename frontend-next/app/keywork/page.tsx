import Link from 'next/link'

import { Card, DataTable, EmptyState, PageHeader, SectionHeader, StatCard } from '@/components/indicare/ui'
import { indicareData } from '@/lib/indicare/demo-data'
import { fullName, getStaffById, getYoungPersonById, sortByDateDesc } from '@/lib/indicare/selectors'

export default function KeyworkPage() {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Keywork" title="Keywork and direct work" description="Keywork sessions by young person, goals, discussion, young person voice, actions and next session dates." action={<Link href="/assistant" className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-500/30">Draft keywork summary</Link>} />
      <section className="grid gap-4 md:grid-cols-3">
        <StatCard label="Sessions" value={indicareData.keyworkSessions.length} />
        <StatCard label="Actions" value={indicareData.keyworkSessions.flatMap((session) => session.actions).length} />
        <StatCard label="Next sessions" value={indicareData.keyworkSessions.filter((session) => session.nextSessionDate).length} />
      </section>
      <Card>
        <SectionHeader eyebrow="Sessions" title="Keywork list" />
        <DataTable
          headers={['Date', 'Young person', 'Staff', 'Topic', 'Goals', 'Young person voice', 'Actions', 'Next']}
          rows={sortByDateDesc(indicareData.keyworkSessions, (session) => session.date).map((session) => {
            const person = getYoungPersonById(session.youngPersonId)
            const staff = getStaffById(session.staffId)
            return [
              session.date,
              person ? <Link key={person.id} href={`/young-people/${person.id}`} className="font-bold text-blue-700">{person.preferredName}</Link> : session.youngPersonId,
              staff ? fullName(staff) : session.staffId,
              session.topic,
              session.goals.join(', '),
              session.youngPersonVoice,
              session.actions.join(', '),
              session.nextSessionDate
            ]
          })}
          empty={<EmptyState title="No keywork sessions" description="No keywork sessions match your current filters." />}
        />
      </Card>
    </div>
  )
}
