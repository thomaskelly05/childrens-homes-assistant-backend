import Link from 'next/link'
import { notFound } from 'next/navigation'

import { LiveDataStatus } from '@/components/indicare/live-data-status'
import { Card, EmptyState, PageHeader, SectionHeader } from '@/components/indicare/ui'
import { getStaff } from '@/lib/os-api/platform'

const liveRecordingRoutes = [
  { id: 'daily_note', label: 'Daily note', route: '/home', hint: 'Choose a child before recording.' },
  { id: 'incident', label: 'Incident', route: '/home', hint: 'Choose a child before recording.' },
  { id: 'safeguarding', label: 'Safeguarding', route: '/safeguarding', hint: 'Open the live safeguarding workspace.' }
]

export default async function StaffRecordingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const staffResult = await getStaff()
  const staff = staffResult.data.staff.find((item) => item.id === id)
  if (!staff) notFound()

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Rapid recording"
        title={`${staff.title} · recording`}
        description="Low-friction recording routes stay linked to live child, safeguarding and chronology workflows."
      />
      <LiveDataStatus result={staffResult} />
      <Card>
        <SectionHeader eyebrow="Quick-add" title="Recording shortcuts" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {liveRecordingRoutes.map((type) => (
            <Link key={type.id} href={type.route} className="rounded-[22px] border border-slate-100 bg-slate-50 p-4 transition hover:bg-white hover:shadow-lg">
              <strong className="text-sm font-black text-slate-950">{type.label}</strong>
              <p className="mt-2 text-sm leading-6 text-slate-600">{type.hint}</p>
            </Link>
          ))}
        </div>
      </Card>
      <Card>
        <SectionHeader eyebrow="Due" title="Recording overdue / requiring attention" />
        <EmptyState title="Live staff recording queue pending" description="No overdue recording is shown until backed by staff-scoped live OS records." />
      </Card>
    </div>
  )
}
