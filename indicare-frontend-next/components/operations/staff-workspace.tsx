import Link from 'next/link'

import { Card, DataTable, EmptyState, SectionHeader, StatusBadge } from '@/components/indicare/ui'
import { RapidRecordingDrawer } from '@/components/operations/rapid-recording'
import { osGet } from '@/lib/os-api/client'

type StaffWorkspace = {
  available?: boolean
  assigned_children?: Array<Record<string, any>>
  outstanding_tasks?: Array<Record<string, any>>
  recording_due?: Array<Record<string, any>>
  handover_actions?: Array<Record<string, any>>
  queues?: Record<string, Array<Record<string, any>>>
  assistant_prompts?: string[]
}

export async function StaffOperationalWorkspace() {
  const result = await osGet<StaffWorkspace>('/staff/me', {
    assigned_children: [],
    outstanding_tasks: [],
    recording_due: [],
    handover_actions: [],
    queues: {}
  })
  const workspace = result.data
  const assignedChildren = workspace.assigned_children || []
  const outstandingTasks = workspace.outstanding_tasks || []
  const recordingDue = workspace.recording_due || []
  const handoverActions = workspace.handover_actions || []
  const queues = workspace.queues || {}

  return (
    <>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Assigned children</p>
          <strong className="mt-2 block text-3xl font-black text-slate-950">{assignedChildren.length}</strong>
        </Card>
        <Card>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Needs attention</p>
          <strong className="mt-2 block text-3xl font-black text-slate-950">{(queues.needs_attention || queues.needsAttention || []).length}</strong>
        </Card>
        <Card>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Recording overdue</p>
          <strong className="mt-2 block text-3xl font-black text-slate-950">{(queues.recording_overdue || queues.recordingOverdue || []).length}</strong>
        </Card>
        <Card>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Awaiting review</p>
          <strong className="mt-2 block text-3xl font-black text-slate-950">{(queues.awaiting_review || queues.awaitingReview || []).length}</strong>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card>
          <SectionHeader eyebrow="Children" title="Assigned children" description="Active risks and care priorities for this staff member." />
          <DataTable
            headers={['Name', 'Risk', 'Safeguarding', 'Open']}
            rows={assignedChildren.map((child) => [
              <Link key={child.id} href={`/young-people/${child.id}`} className="font-black text-slate-950">{child.preferred_name || child.display_name || child.name || `Child ${child.id}`}</Link>,
              child.risk_level || 'Not returned',
              child.safeguarding_status || 'Not returned',
              <Link key="open" href={`/young-people/${child.id}`} className="font-bold text-blue-700">Open</Link>
            ])}
            empty={<EmptyState title="No assigned children" description="No active allocations were found for this staff member." />}
          />
        </Card>

        <Card>
          <SectionHeader eyebrow="Queues" title="Operational task queue" />
          <div className="space-y-3">
            {outstandingTasks.slice(0, 8).map((card) => (
              <Link key={card.id} href={card.href} className="block rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <strong className="text-sm font-black text-slate-950">{card.title}</strong>
                  <StatusBadge value={card.urgency || card.priority || 'review'} />
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">{card.summary || card.description || 'No summary returned.'}</p>
              </Link>
            ))}
            {!outstandingTasks.length ? <EmptyState title="No tasks returned" description="No live staff tasks were returned for this workspace." /> : null}
          </div>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <Card>
          <SectionHeader eyebrow="Recording" title="Recording due" />
          <ul className="space-y-3 text-sm leading-6 text-slate-600">
            {recordingDue.map((log) => <li key={log.id} className="rounded-2xl bg-slate-50 p-4">{log.summary || log.description || log.title || 'Recording item returned without summary.'}</li>)}
            {!recordingDue.length ? <li>No overdue recording was returned for this staff member.</li> : null}
          </ul>
        </Card>
        <Card>
          <SectionHeader eyebrow="Handover" title="Handover actions" />
          <ul className="space-y-3 text-sm leading-6 text-slate-600">
            {handoverActions.slice(0, 5).map((item) => <li key={item.id} className="rounded-2xl bg-slate-50 p-4">{item.title || item.body || 'Handover item'}</li>)}
            {!handoverActions.length ? <li>No handover actions were returned.</li> : null}
          </ul>
        </Card>
        <Card>
          <SectionHeader eyebrow="Assistant" title="Shift prompts" />
          <ul className="space-y-2 text-sm font-bold leading-6 text-slate-700">
            {(workspace.assistant_prompts || [
              'What do I need to complete this shift?',
              'Which children need attention?',
              'What recording is overdue?'
            ]).map((prompt) => <li key={prompt}>{prompt}</li>)}
          </ul>
        </Card>
      </section>

      <RapidRecordingDrawer />
    </>
  )
}
