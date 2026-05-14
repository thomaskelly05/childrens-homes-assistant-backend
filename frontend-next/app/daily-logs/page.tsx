import Link from 'next/link'

import { Card, DataTable, EmptyState, PageHeader, SectionHeader, StatCard } from '@/components/indicare/ui'
import { indicareData } from '@/lib/indicare/demo-data'
import { fullName, getStaffById, getYoungPersonById, sortByDateDesc } from '@/lib/indicare/selectors'

export default function DailyLogsPage() {
  const todayLogs = indicareData.dailyLogs.filter((log) => log.date === '2026-05-13')

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Daily logs" title="Daily recording" description="Shift-by-shift daily logs linked into young person records, staff activity, reports, handover and audit evidence." action={<Link href="/home" className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-500/30">Choose child to add daily note</Link>} />
      <section className="grid gap-4 md:grid-cols-3">
        <StatCard label="Logs today" value={todayLogs.length} />
        <StatCard label="Young people covered" value={new Set(todayLogs.map((log) => log.youngPersonId)).size} />
        <StatCard label="Follow-up actions" value={indicareData.dailyLogs.flatMap((log) => log.followUpActions).length} />
      </section>
      <Card>
        <SectionHeader eyebrow="All logs" title="Daily log list" description="Filters supported by data fields: young person, staff, date and shift." />
        <DataTable
          headers={['Date', 'Shift', 'Young person', 'Staff', 'Mood', 'Presentation', 'Actions']}
          rows={sortByDateDesc(indicareData.dailyLogs, (log) => log.createdAt).map((log) => {
            const person = getYoungPersonById(log.youngPersonId)
            const staff = getStaffById(log.staffId)
            return [
              log.date,
              log.shift,
              person ? <Link key={person.id} href={`/young-people/${person.id}`} className="font-bold text-blue-700">{person.preferredName}</Link> : log.youngPersonId,
              staff ? fullName(staff) : log.staffId,
              log.mood,
              log.presentation,
              log.followUpActions.join(', ') || 'None'
            ]
          })}
          empty={<EmptyState title="No daily logs" description="No daily logs match your current filters." />}
        />
      </Card>
    </div>
  )
}
