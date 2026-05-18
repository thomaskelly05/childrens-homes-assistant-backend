import Link from 'next/link'

import { LiveDataStatus } from '@/components/indicare/live-data-status'
import { Card, DataTable, EmptyState, PageHeader, SectionHeader, StatCard, StatusBadge } from '@/components/indicare/ui'
import { getGovernanceCommandCentre } from '@/lib/os-api/governance'

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

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Governance command centre"
        title="Operational governance, evidence and inspection readiness"
        description="One leadership view for inspection readiness, workforce health, safeguarding drift, child journey health, governance actions, evidence gaps, Reg 44, Reg 45 and ORB governance summaries."
        action={<Link prefetch={false} href="/ofsted-readiness" className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-500/30">Open inspection readiness</Link>}
      />
      <LiveDataStatus result={centre} />

      <section className="grid gap-4 md:grid-cols-5">
        <StatCard label="Inspection readiness" value={text(summary.inspection_readiness, 'Review')} detail="Backend readiness forecast" href="/ofsted-readiness" />
        <StatCard label="Governance risk" value={text(summary.governance_risk, 'Unknown')} detail={`Score ${text(summary.governance_score, 'not returned')}`} />
        <StatCard label="Evidence gaps" value={text(summary.evidence_gaps, 0)} detail={`${text(matrixSummary.evidence_sources, 0)} sources indexed`} href="/evidence" />
        <StatCard label="Open concerns" value={text(summary.unresolved_concerns, actions.length)} detail="Consolidated governance actions" href="/actions" />
        <StatCard label="Workforce alerts" value={text(summary.workforce_alerts, 0)} detail="From Workforce OS command centre" href="/staff/command-centre" />
      </section>

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
