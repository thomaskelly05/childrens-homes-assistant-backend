import Link from 'next/link'

import { Card, DataTable, EmptyState, SectionHeader, StatusBadge } from '@/components/indicare/ui'
import { RapidRecordingDrawer } from '@/components/operations/rapid-recording'
import { fullName } from '@/lib/indicare/selectors'
import { staffOperationalWorkspace } from '@/lib/operations/shift-data'

export function StaffOperationalWorkspace({ staffId }: { staffId: string }) {
  const workspace = staffOperationalWorkspace(staffId)
  const staff = workspace.staff

  return (
    <>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Assigned children</p>
          <strong className="mt-2 block text-3xl font-black text-slate-950">{workspace.assignedChildren.length}</strong>
        </Card>
        <Card>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Needs attention</p>
          <strong className="mt-2 block text-3xl font-black text-slate-950">{workspace.queues.needsAttention.length}</strong>
        </Card>
        <Card>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Recording overdue</p>
          <strong className="mt-2 block text-3xl font-black text-slate-950">{workspace.queues.recordingOverdue.length}</strong>
        </Card>
        <Card>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Awaiting review</p>
          <strong className="mt-2 block text-3xl font-black text-slate-950">{workspace.queues.awaitingReview.length}</strong>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card>
          <SectionHeader eyebrow="Children" title="Assigned children" description="Active risks and care priorities for this staff member." />
          <DataTable
            headers={['Name', 'Risk', 'Safeguarding', 'Open']}
            rows={workspace.assignedChildren.map((child) => [
              <Link key={child.id} href={`/young-people/${child.id}`} className="font-black text-slate-950">{child.preferredName} {child.lastName}</Link>,
              child.riskLevel,
              child.safeguardingStatus,
              <Link key="open" href={`/young-people/${child.id}`} className="font-bold text-blue-700">Open</Link>
            ])}
            empty={<EmptyState title="No assigned children" description="No active allocations were found for this staff member." />}
          />
        </Card>

        <Card>
          <SectionHeader eyebrow="Queues" title="Operational task queue" />
          <div className="space-y-3">
            {workspace.outstandingTasks.slice(0, 8).map((card) => (
              <Link key={card.id} href={card.href} className="block rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <strong className="text-sm font-black text-slate-950">{card.title}</strong>
                  <StatusBadge value={card.urgency} />
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">{card.summary}</p>
              </Link>
            ))}
          </div>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <Card>
          <SectionHeader eyebrow="Recording" title="Recording due" />
          <ul className="space-y-3 text-sm leading-6 text-slate-600">
            {workspace.recordingDue.map((log) => <li key={log.id} className="rounded-2xl bg-slate-50 p-4">{log.followUpActions.join(', ')}</li>)}
            {!workspace.recordingDue.length ? <li>No overdue recording for {staff ? fullName(staff) : 'this staff member'}.</li> : null}
          </ul>
        </Card>
        <Card>
          <SectionHeader eyebrow="Handover" title="Handover actions" />
          <ul className="space-y-3 text-sm leading-6 text-slate-600">
            {workspace.handoverActions.slice(0, 5).map((item) => <li key={item.id} className="rounded-2xl bg-slate-50 p-4">{item.title}</li>)}
          </ul>
        </Card>
        <Card>
          <SectionHeader eyebrow="Assistant" title="Shift prompts" />
          <ul className="space-y-2 text-sm font-bold leading-6 text-slate-700">
            <li>What do I need to complete this shift?</li>
            <li>Which children need attention?</li>
            <li>What recording is overdue?</li>
            <li>Summarise safeguarding concerns for my shift.</li>
            <li>What follow-up actions remain?</li>
          </ul>
        </Card>
      </section>

      <RapidRecordingDrawer />
    </>
  )
}
