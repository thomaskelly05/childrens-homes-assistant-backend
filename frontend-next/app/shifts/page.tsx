import Link from 'next/link'

import { LiveDataStatus } from '@/components/indicare/live-data-status'
import { Card, EmptyState, PageHeader, SectionHeader, StatCard } from '@/components/indicare/ui'
import { getCommandCentre } from '@/lib/os-api/platform'

export default async function ShiftsPage() {
  const commandResult = await getCommandCentre()
  const command = commandResult.data

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Shift operations"
        title="Shift execution workspace"
        description="Start, join, run and hand over a shift from one operational surface built around welfare checks, recording quality, safeguarding review and management oversight."
        action={<Link href="/shifts/current" className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-500/30">Open current shift</Link>}
      />
      <LiveDataStatus result={commandResult} />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Visible staff" value={command.workforce.length} detail="Returned by live context" href="/staff" entity={{ entity_type: 'staff_record' }} />
        <StatCard label="Children" value={command.children.length} detail="Need shift awareness" href="/young-people" entity={{ entity_type: 'young_person' }} />
        <StatCard label="Outstanding priorities" value={command.attention.length} detail="Derived from live OS records" href="/shifts/current" entity={{ entity_type: 'shift' }} />
        <StatCard label="Open actions" value={command.actions.filter((action) => action.status !== 'completed').length} detail="Action register" href="/actions" entity={{ entity_type: 'action' }} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.65fr)]">
        <Card>
          <SectionHeader eyebrow="Lifecycle" title="Shift state" description="Operational lifecycle states keep handover and sign-off inspectable." />
          <EmptyState title="Live shift lifecycle pending" description="No shift lifecycle rows are shown until backed by live shift storage." />
        </Card>
        <Card>
          <SectionHeader eyebrow="Assistant" title="Shift operations support" description="Assistant prompts are hidden until linked to chronology/evidence-backed context." />
          <EmptyState title="No assistant prompts generated" description="The assistant remains a copilot and does not create operational truth for shift state." />
        </Card>
      </section>
    </div>
  )
}
