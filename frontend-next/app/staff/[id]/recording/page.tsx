import Link from 'next/link'
import { notFound } from 'next/navigation'

import { Card, DataTable, EmptyState, PageHeader, SectionHeader, StatusBadge } from '@/components/indicare/ui'
import { RapidRecordingDrawer } from '@/components/operations/rapid-recording'
import { fullName, getStaffById, getYoungPersonById } from '@/lib/indicare/selectors'
import { rapidRecordingTypes, staffOperationalWorkspace } from '@/lib/operations/shift-data'

export default async function StaffRecordingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const staff = getStaffById(id)
  if (!staff) notFound()
  const workspace = staffOperationalWorkspace(id)

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Rapid recording"
        title={`${fullName(staff)} · recording`}
        description="Low-friction mobile recording with smart templates, recent phrases, AI drafting support, voice placeholder and offline queue foundation."
      />
      <Card>
        <SectionHeader eyebrow="Quick-add" title="Recording shortcuts" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {rapidRecordingTypes.map((type) => (
            <Link key={type.id} href={type.route} className="rounded-[22px] border border-slate-100 bg-slate-50 p-4 transition hover:bg-white hover:shadow-lg">
              <strong className="text-sm font-black text-slate-950">{type.label}</strong>
              <p className="mt-2 text-sm leading-6 text-slate-600">{type.hint}</p>
            </Link>
          ))}
        </div>
      </Card>
      <Card>
        <SectionHeader eyebrow="Due" title="Recording overdue / requiring attention" />
        <DataTable
          headers={['Child', 'Date', 'Reason', 'Status']}
          rows={workspace.recordingDue.map((log) => [
            getYoungPersonById(log.youngPersonId)?.preferredName || log.youngPersonId,
            log.date,
            log.followUpActions.join(', '),
            <StatusBadge key="status" value="recording overdue" />
          ])}
          empty={<EmptyState title="No overdue recording" description="No overdue recording is currently assigned." />}
        />
      </Card>
      <RapidRecordingDrawer />
    </div>
  )
}
