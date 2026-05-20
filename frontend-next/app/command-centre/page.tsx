import Link from 'next/link'

import { LiveDataStatus } from '@/components/indicare/live-data-status'
import { CognitionPromptStack, OperationalBarChart, OperationalSignalGrid, OperationalTrendChart, WellbeingRing } from '@/components/indicare/operational-cognition-widgets'
import { OperationalQuickActions } from '@/components/indicare/operational/operational-quick-actions'
import { Card, DataTable, EmptyState, PageHeader, SectionHeader, StatCard, StatusBadge } from '@/components/indicare/ui'
import { getGovernanceCommandCentre } from '@/lib/os-api/governance'
import { getCommandCentre } from '@/lib/os-api/platform'
import { getWorkforceCommandCentre } from '@/lib/os-api/workforce'
import { buildChronologyThemeData, buildChronologyTrendData, buildCommandCentreSignals, buildOperationalPressureData, buildReflectivePrompts, buildWellbeingRings } from '@/lib/operational/cognition-metrics'

function text(value: unknown, fallback: unknown = 'Not returned'): string | number {
  if (value === undefined || value === null || value === '') return typeof fallback === 'number' ? fallback : String(fallback ?? 'Not returned')
  if (typeof value === 'object') return JSON.stringify(value).slice(0, 160)
  return String(value)
}

function count(value: unknown) {
  return Array.isArray(value) ? value.length : 0
}

export default async function UnifiedCommandCentrePage() {
  const platform = await getCommandCentre()
  const governance = await getGovernanceCommandCentre()
  const workforce = await getWorkforceCommandCentre()

  const platformData = platform.data
  const governanceData = governance.data
  const workforceData = workforce.data
  const governanceSummary = governanceData.summary || {}
  const orbSummary = governanceData.orb_governance_summary?.governance_summary || governanceData.orb_governance_summary || {}
  const signals = buildCommandCentreSignals(platformData, governanceData, workforceData)
  const pressureData = buildOperationalPressureData(platformData, governanceData, workforceData)
  const chronologyTrend = buildChronologyTrendData(platformData.chronology)
  const chronologyThemes = buildChronologyThemeData(platformData.chronology)
  const wellbeingRings = buildWellbeingRings(platformData, workforceData)
  const reflectivePrompts = buildReflectivePrompts(platformData, governanceData, workforceData)

  const selectedChild = platformData.children?.[0]

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Care Hub"
        title="Operational Pulse"
        description="A calm operational view of what changed, what needs attention and what support children may need next."
      />

      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
        <Card className="p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-electric-600">Shift understanding</p>
              <h2 className="mt-1 text-2xl font-black text-slate-900">What does the home need right now?</h2>
              <p className="mt-2 max-w-2xl text-sm text-slate-600">
                Use live chronology, safeguarding, workforce and ORB cognition to understand what changed this shift, what support appears helpful and what adults should understand next.
              </p>
            </div>
            <LiveDataStatus live={platform.live} label="Live operational state" />
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {signals.slice(0, 4).map((signal) => (
              <StatCard
                key={signal.label}
                title={signal.label}
                value={signal.value}
                description={signal.description}
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
