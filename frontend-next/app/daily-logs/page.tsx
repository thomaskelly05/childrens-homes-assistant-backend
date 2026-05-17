import Link from 'next/link'

import { LiveDataStatus } from '@/components/indicare/live-data-status'
import { Card, DataTable, EmptyState, PageHeader, SectionHeader, StatCard } from '@/components/indicare/ui'
import { getOsChronology } from '@/lib/os-api/chronology'

export default async function DailyLogsPage() {
  const dailyLogsResult = await getOsChronology({ sourceType: 'daily_log' })
  const logs = dailyLogsResult.data

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Daily logs" title="Daily recording" description="Shift-by-shift daily logs linked into young person records, staff activity, reports, handover and audit evidence." action={<Link href="/home" className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-500/30">Choose child to add daily note</Link>} />
      <LiveDataStatus result={dailyLogsResult} />
      <section className="grid gap-4 md:grid-cols-3">
        <StatCard label="Daily logs" value={logs.length} />
        <StatCard label="Young people covered" value={new Set(logs.flatMap((log) => log.youngPersonIds)).size} />
        <StatCard label="Follow-up actions" value={logs.filter((log) => log.actionIds.length).length} />
      </section>
      <Card>
        <SectionHeader eyebrow="All logs" title="Daily log list" description="Filters supported by data fields: young person, staff, date and shift." />
        <DataTable
          headers={['Date', 'Young person', 'Staff', 'Recording', 'Summary', 'Actions']}
          rows={logs.map((log) => [
            log.dateTime,
            log.youngPersonIds[0] ? <Link key={log.id} href={`/young-people/${log.youngPersonIds[0]}`} className="font-bold text-blue-700">Child {log.youngPersonIds[0]}</Link> : 'Home-wide',
            log.staffIds[0] || 'Not recorded',
            <Link key={log.id} href={`/daily-logs/${log.sourceId || log.id}`} className="font-black text-slate-950 hover:text-blue-700">{log.title}</Link>,
            log.summary,
            log.actionIds.length
          ])}
          empty={<EmptyState title="No daily logs" description="No daily logs match your current filters." />}
        />
      </Card>
    </div>
  )
}
