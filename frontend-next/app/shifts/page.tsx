import Link from 'next/link'

import { Card, PageHeader, SectionHeader, StatCard, StatusBadge } from '@/components/indicare/ui'
import { MobileActionBar, OperationalPriorityBoard } from '@/components/operations/operational-cards'
import { RapidRecordingDrawer } from '@/components/operations/rapid-recording'
import { currentShift, proactiveAssistantSupport } from '@/lib/operations/shift-data'

export default function ShiftsPage() {
  const shift = currentShift()
  const assistant = proactiveAssistantSupport()

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Shift operations"
        title="Shift execution workspace"
        description="Start, join, run and hand over a shift from one operational surface built around welfare checks, recording quality, safeguarding review and management oversight."
        action={<Link href="/shifts/current" className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-500/30">Open current shift</Link>}
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active staff" value={shift.stats.activeStaff} detail="Joined this shift" href="/staff/me" entity={{ entity_type: 'staff_record' }} />
        <StatCard label="Assigned children" value={shift.stats.assignedChildren} detail="Need shift awareness" href="/young-people" entity={{ entity_type: 'young_person' }} />
        <StatCard label="Outstanding priorities" value={shift.stats.outstandingTasks} detail="Scored by operational urgency" href="/shifts/current" entity={{ entity_type: 'shift', entity_id: shift.id }} />
        <StatCard label="Manager escalations" value={shift.stats.managerEscalations} detail="High or critical review items" href="/management" entity={{ entity_type: 'qa_review' }} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.65fr)]">
        <OperationalPriorityBoard cards={shift.cards} />
        <Card>
          <SectionHeader eyebrow="Lifecycle" title="Shift state" description="Operational lifecycle states keep handover and sign-off inspectable." />
          <div className="space-y-3">
            {shift.lifecycle.map((state) => (
              <div key={state.label} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <span className="text-sm font-black capitalize text-slate-800">{state.label}</span>
                <StatusBadge value={state.completed ? 'completed' : 'pending'} />
              </div>
            ))}
          </div>
        </Card>
      </section>

      <Card>
        <SectionHeader eyebrow="Proactive assistant" title="Shift operations mode" description="The embedded assistant should stay calm, cited and action-oriented." />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-[24px] border border-blue-100 bg-blue-50 p-5">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-700">Suggested prompts</p>
            <ul className="mt-4 space-y-2 text-sm font-bold leading-6 text-blue-950">
              {assistant.prompts.map((prompt) => <li key={prompt}>• {prompt}</li>)}
            </ul>
          </div>
          <div className="rounded-[24px] border border-amber-100 bg-amber-50 p-5">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-amber-700">Quality flags</p>
            <ul className="mt-4 space-y-2 text-sm font-bold leading-6 text-amber-950">
              {assistant.suggestedActions.map((action) => <li key={action}>• {action}</li>)}
            </ul>
          </div>
        </div>
      </Card>

      <MobileActionBar />
      <RapidRecordingDrawer />
    </div>
  )
}
