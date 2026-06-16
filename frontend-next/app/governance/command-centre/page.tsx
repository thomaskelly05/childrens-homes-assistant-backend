import Link from 'next/link'

import { LiveDataStatus } from '@/components/indicare/live-data-status'
import { CognitionPromptStack, OperationalBarChart, OperationalSignalGrid } from '@/components/indicare/operational-cognition-widgets'
import { Card, DataTable, EmptyState, PageHeader, SectionHeader, StatCard, StatusBadge } from '@/components/indicare/ui'
import { getGovernanceCommandCentre } from '@/lib/os-api/governance'
import { valueFromRecord } from '@/lib/operational/cognition-metrics'

function text(value: unknown, fallback: unknown = 'Not returned'): string | number {
  if (value === undefined || value === null || value === '') return typeof fallback === 'number' ? fallback : String(fallback ?? 'Not returned')
  if (typeof value === 'object') return JSON.stringify(value).slice(0, 180)
  return String(value)
}

function label(value: unknown, fallback = 'Not returned') {
  return String(text(value, fallback))
}

export default async function GovernanceCommandCentrePage() {
  const centre = await getGovernanceCommandCentre()
  const data = centre.data
  const summary = data.summary || {}
  const matrixSummary = data.evidence_matrix?.summary || {}
  const matrixEntries = data.evidence_matrix?.entries || []
  const actions = data.governance_actions || []
  const reg44Visits = Array.isArray(data.reg44?.visits) ? data.reg44.visits : []
  const orbSummary = data.orb_governance_summary?.governance_summary || {}
  const snapshot = data.snapshot || {}
  const governanceSignals = [
    { label: 'SCCIF visibility', value: text(summary.inspection_readiness, valueFromRecord(data.inspection_readiness || {}, ['status'], 'Review')), detail: `${matrixEntries.length} evidence matrix entr${matrixEntries.length === 1 ? 'y' : 'ies'}`, tone: 'blue' as const },
    { label: 'Operational drift', value: text(summary.governance_risk, valueFromRecord(data.governance_risk || {}, ['level', 'status'], 'Review')), detail: `${actions.length} governance action${actions.length === 1 ? '' : 's'}`, tone: actions.length ? 'amber' as const : 'emerald' as const },
    { label: 'Safeguarding posture', value: text(summary.safeguarding_posture, valueFromRecord(data.safeguarding_drift || {}, ['status', 'level'], 'Review')), detail: 'Safeguarding drift from Governance OS', tone: 'purple' as const },
    { label: 'Child voice visibility', value: text(summary.child_voice_visibility, valueFromRecord(data.child_journey_health || {}, ['child_voice_visibility', 'status'], 'Review')), detail: 'Child journey health summary', tone: 'emerald' as const }
  ]
  const oversightData = [
    { label: 'Actions', value: actions.length },
    { label: 'Concerns', value: data.unresolved_concerns.length },
    { label: 'Evidence', value: matrixEntries.length },
    { label: 'Reg 44', value: reg44Visits.length },
    { label: 'Flags', value: Object.keys(data.feature_flags || {}).length }
  ]
  const oversightRows = [
    ['What themes are emerging?', label(summary.safeguarding_posture || summary.governance_risk || valueFromRecord(data.safeguarding_drift || {}, ['summary', 'status'], 'Review safeguarding, workforce and evidence themes'))],
    ['Where is oversight strongest?', matrixEntries.length ? `${matrixEntries.length} SCCIF evidence entries visible` : label(summary.inspection_readiness, 'Evidence matrix not returned')],
    ['Where may evidence need strengthening?', label(summary.evidence_gaps, String(valueFromRecord(data.evidence_matrix?.summary || {}, ['gaps', 'evidence_gaps'], 'Review evidence matrix gaps')))],
    ['Where is child voice visible?', label(summary.child_voice_visibility || valueFromRecord(data.child_journey_health || {}, ['child_voice_visibility', 'summary'], 'Review child journey health'))],
    ['What operational pressures exist?', actions.length || data.unresolved_concerns.length ? `${actions.length} governance action(s), ${data.unresolved_concerns.length} unresolved concern(s)` : 'No governance action pressure returned']
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Governance command centre"
        title="Operational governance, evidence and Inspection evidence preparation"
        description="One leadership view for Inspection evidence preparation, workforce health, safeguarding drift, child journey health, governance actions, evidence gaps, Reg 44, Reg 45 and ORB governance summaries."
        action={<Link prefetch={false} href="/inspection evidence preparation" className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-500/30">Open Inspection evidence preparation</Link>}
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <LiveDataStatus result={centre} />

        <Card>
          <SectionHeader eyebrow="Projection status" title="Governance operational snapshot" description="The Governance OS now uses reusable operational projections instead of rebuilding governance intelligence every page load." />
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
              <span className="font-bold text-slate-600">Snapshot mode</span>
              <StatusBadge value={snapshot.hit ? 'projection cache hit' : 'live rebuild'} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-slate-100 bg-white px-4 py-3">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Version</p>
                <p className="mt-1 text-sm font-bold text-slate-700">{text(snapshot.version, 'v1')}</p>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-white px-4 py-3">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Generated</p>
                <p className="mt-1 text-sm font-bold text-slate-700">{text(snapshot.generated_at, 'Live')}</p>
              </div>
            </div>
            <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-400">Projection key</p>
              <p className="mt-1 break-all text-xs font-bold text-blue-700">{text(snapshot.projection_key, 'Not returned')}</p>
            </div>
          </div>
        </Card>
      </div>

      <section className="grid gap-4 md:grid-cols-5">
        <StatCard label="Inspection evidence preparation" value={text(summary.inspection_readiness, 'Review')} detail="Backend readiness forecast" href="/inspection evidence preparation" />
        <StatCard label="Governance risk" value={text(summary.governance_risk, 'Unknown')} detail={`Score ${text(summary.governance_score, 'not returned')}`} />
        <StatCard label="Evidence gaps" value={text(summary.evidence_gaps, 0)} detail={`${text(matrixSummary.evidence_sources, 0)} sources indexed`} href="/evidence" />
        <StatCard label="Open concerns" value={text(summary.unresolved_concerns, actions.length)} detail="Consolidated governance actions" href="/actions" />
        <StatCard label="Workforce alerts" value={text(summary.workforce_alerts, 0)} detail="From Workforce OS command centre" href="/staff/command-centre" />
      </section>

      <OperationalSignalGrid signals={governanceSignals} />

      <section className="grid gap-6 xl:grid-cols-2">
        <OperationalBarChart title="Governance oversight visibility" data={oversightData} />
        <CognitionPromptStack
          title="Reflective operational oversight"
          prompts={[
            'Which SCCIF area has evidence quality but not enough child voice?',
            'Where might operational drift be developing before it becomes safeguarding-critical?',
            'What governance action would create the clearest leadership grip today?',
            'Which workforce or chronology signal should the registered manager evidence next?'
          ]}
          action={<Link href="/assistant/orb?scope=governance" className="rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-950">Ask ORB</Link>}
        />
      </section>

      <Card data-testid="governance-meaningful-oversight">
        <SectionHeader eyebrow="Meaningful oversight" title="Themes, visibility and leadership response" description="Governance surfaces safeguarding themes, child impact, emotional atmosphere, evidence quality and operational drift from the existing command-centre payload." />
        <DataTable
          headers={['Reflective question', 'Existing intelligence surfaced']}
          rows={oversightRows}
          empty={<EmptyState title="No governance oversight summary" description="Governance OS did not return reflective oversight signals." />}
        />
      </Card>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.8fr)]">
        <Card>
          <SectionHeader eyebrow="SCCIF evidence matrix" title="Evidence traceability" description="SCCIF, Quality Standards and Regulations are populated from backend ontology and evidence links." />
          <DataTable
            headers={['Area', 'Type', 'Coverage', 'Evidence']}
            rows={matrixEntries.slice(0, 10).map((entry) => [
              entry.title || entry.node_id,
              text(entry.node_type),
              <StatusBadge key={entry.node_id} value={label(entry.coverage, 'gap')} />,
              text(entry.evidence_count, 0)
            ])}
            empty={<EmptyState title="No matrix entries returned" description="The governance evidence matrix did not return entries for this session." />}
          />
        </Card>
        <Card>
          <SectionHeader eyebrow="ORB governance context" title="Evidence-linked summary" description="ORB uses this summary and linked evidence sources for governance, readiness and leadership questions." />
          <div className="space-y-3">
            {Object.entries(orbSummary).map(([key, value]) => (
              <div key={key} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">{key.replaceAll('_', ' ')}</p>
                <p className="mt-1 text-sm font-bold text-slate-700">{text(value)}</p>
              </div>
            ))}
            {!Object.keys(orbSummary).length ? <EmptyState title="No ORB summary returned" description="The governance ORB context was not returned by the backend." /> : null}
          </div>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card>
          <SectionHeader eyebrow="Governance actions" title="Leadership action queue" />
          <DataTable
            headers={['Action', 'Priority', 'Route']}
            rows={actions.slice(0, 12).map((action, index) => [
              action.action || action.title || `Action ${index + 1}`,
              <StatusBadge key={index} value={label(action.priority, 'review')} />,
              action.route ? <Link key={action.route} href={String(action.route)} className="font-black text-blue-700">Open</Link> : 'Review'
            ])}
            empty={<EmptyState title="No governance actions returned" description="No consolidated governance action queue was returned." />}
          />
        </Card>
        <Card>
          <SectionHeader eyebrow="Reg 44 lifecycle" title="Visit workflow" description="Scheduled, in progress, completed, reviewed, actioned and closed workflow states." />
          <DataTable
            headers={['Visit', 'Status', 'Actions']}
            rows={reg44Visits.map((visit: any) => [
              text(visit.visitor_name || visit.id, 'Draft visit'),
              <StatusBadge key={visit.id} value={label(visit.status, 'scheduled')} />,
              text((visit.actions || []).length, 0)
            ])}
            empty={<EmptyState title="No Reg 44 workflow returned" description="No Reg 44 lifecycle data was returned for this home." />}
          />
        </Card>
      </section>
    </div>
  )
}
