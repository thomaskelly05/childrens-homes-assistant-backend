import Link from 'next/link'

import { LiveDataStatus } from '@/components/indicare/live-data-status'
import { OperationalQuickActions } from '@/components/indicare/operational/operational-quick-actions'
import { Card, PageHeader, StatCard } from '@/components/indicare/ui'
import { getGovernanceCommandCentre } from '@/lib/os-api/governance'
import { getCommandCentre } from '@/lib/os-api/platform'
import { getWorkforceCommandCentre } from '@/lib/os-api/workforce'
import { buildCommandCentreSignals } from '@/lib/operational/cognition-metrics'

export default async function UnifiedCommandCentrePage() {
  const platform = await getCommandCentre()
  const governance = await getGovernanceCommandCentre()
  const workforce = await getWorkforceCommandCentre()

  const platformData = platform.data
  const governanceData = governance.data
  const workforceData = workforce.data
  const signals = buildCommandCentreSignals(platformData, governanceData, workforceData)
  const selectedChild = platformData.children?.[0]

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Care Hub"
        title="Operational Pulse"
        description="A calm operational view of what changed, what needs attention and what support children may need next."
        action={<Link prefetch={false} href="/orb?context=care-hub&q=What needs attention now?" className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-lg shadow-slate-950/20">Ask ORB</Link>}
      />

      <section className="grid gap-3 md:grid-cols-3">
        <LiveDataStatus result={platform} />
        <LiveDataStatus result={governance} />
        <LiveDataStatus result={workforce} />
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
        <Card>
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-blue-700">Shift understanding</p>
          <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-slate-950">What does the home need right now?</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Start here for what changed, what needs review, and what adults should understand before recording or handing over.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {signals.slice(0, 4).map((signal) => (
              <StatCard
                key={signal.label}
                label={signal.label}
                value={signal.value}
                detail={signal.description}
              />
            ))}
          </div>
        </Card>

        <OperationalQuickActions
          selectedYoungPersonId={selectedChild?.id ? String(selectedChild.id) : undefined}
          selectedYoungPersonName={selectedChild?.name || selectedChild?.full_name}
        />
      </div>
    </div>
  )
}
