import Link from 'next/link'

import { LiveDataStatus } from '@/components/indicare/live-data-status'
import { Card, DataTable, EmptyState, PageHeader, SectionHeader, StatCard, StatusBadge } from '@/components/indicare/ui'
import { getGovernanceCommandCentre } from '@/lib/os-api/governance'
import { getCommandCentre } from '@/lib/os-api/platform'
import { getWorkforceCommandCentre } from '@/lib/os-api/workforce'

function text(value: unknown, fallback: unknown = 'Not returned'): string | number {
  if (value === undefined || value === null || value === '') return typeof fallback === 'number' ? fallback : String(fallback ?? 'Not returned')
  if (typeof value === 'object') return JSON.stringify(value).slice(0, 160)
  return String(value)
}

function count(value: unknown) {
  return Array.isArray(value) ? value.length : 0
}

export default async function UnifiedCommandCentrePage() {
  // Keep OS hydration deliberately sequential on the server. The command centre
  // touches high-level platform, governance and workforce bundles; loading them
  // in parallel can briefly exhaust the shared Postgres pool during sign-in and
  // first-load bursts. The API client still uses no-store, so data remains live.
  const platform = await getCommandCentre()
  const governance = await getGovernanceCommandCentre()
  const workforce = await getWorkforceCommandCentre()

  const platformData = platform.data
  const governanceData = governance.data
  const workforceData = workforce.data
  const governanceSummary = governanceData.summary || {}
  const orbSummary = governanceData.orb_governance_summary?.governance_summary || governanceData.orb_governance_summary || {}
  const operationalAlerts = [
    ...platformData.attention.map((item) => ({
      title: item.title,
      severity: item.status,
      evidence: item.body,
      href: item.href
    })),
    ...workforceData.alerts.slice(0, 4).map((alert) => ({
      title: text(alert.title || alert.type, 'Workforce alert'),
      severity: text(alert.severity, 'review'),
      evidence: text(alert.detail || alert.summary, 'Workforce OS alert'),
      href: '/staff/command-centre'
    })),
    ...governanceData.governance_actions.slice(0, 4).map((action) => ({
      title: text(action.action || action.title, 'Governance action'),
      severity: text(action.priority, 'review'),
      evidence: text(action.reason || action.detail || action.status, 'Governance action'),
      href: String(action.route || '/governance/command-centre')
    }))
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Unified command centre"
        title="One operational leadership workspace"
        description="A calm command centre joining workforce health, child journey health, governance risk, safeguarding concerns, relational stability, inspection readiness, operational alerts and ORB summaries."
        action={<Link prefetch={false} href="/orb?context=command-centre" className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-lg shadow-slate-950/20">Ask ORB about this view</Link>}
      />

      <section className="grid gap-3 md:grid-cols-3">
        <LiveDataStatus result={platform} />
        <LiveDataStatus result={governance} />
        <LiveDataStatus result={workforce} />
      </section>

      <section className="grid gap-4 md:grid-cols-4 xl:grid-cols-8">
        <StatCard label="Children" value={platformData.children.length} detail="Visible child records" href="/young-people" />
        <StatCard label="Child journey health" value={text(governanceSummary.child_journey_health, platformData.chronology.length)} detail="Backend summary or chronology coverage" href="/chronology" />
        <StatCard label="Workforce health" value={text(governanceSummary.workforce_health, workforceData.alerts.length)} detail={`${workforceData.wellbeing_alerts.length} wellbeing alerts`} href="/staff/command-centre" />
        <StatCard label="Governance risk" value={text(governanceSummary.governance_risk, 'Review')} detail={`Score ${text(governanceSummary.governance_score, 'not returned')}`} href="/governance/command-centre" />
        <StatCard label="Safeguarding" value={platformData.safeguarding.length} detail="Open and recent safeguarding records" href="/safeguarding" />
        <StatCard label="Relational stability" value={text(governanceSummary.relational_stability, 'Review')} detail="Backend relationship signal" href="/staff/relationships" />
        <StatCard label="Inspection" value={text(governanceSummary.inspection_readiness, 'Review')} detail="Readiness forecast" href="/ofsted-readiness" />
        <StatCard label="Alerts" value={operationalAlerts.length} detail="Consolidated actionable queue" href="/notifications" />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)]">
        <Card>
          <SectionHeader eyebrow="Operational alerts" title="Severity-aware actionable queue" description="Alerts stay linked to their source surface; calculation remains in backend adapters and domain APIs." />
          <DataTable
            headers={['Alert', 'Severity', 'Evidence', 'Action']}
            rows={operationalAlerts.slice(0, 12).map((alert) => [
              String(alert.title),
              <StatusBadge key={`${alert.title}-severity`} value={String(alert.severity)} />,
              String(alert.evidence),
              <Link key={`${alert.title}-href`} href={alert.href} className="font-black text-blue-700">Open</Link>
            ])}
            empty={<EmptyState title="No operational alerts returned" description="No platform, workforce or governance alerts were returned for this role." />}
          />
        </Card>

        <Card>
          <SectionHeader eyebrow="ORB summary" title="Embedded intelligence context" description="ORB receives the command-centre route, role and linked operational context from the unified shell." />
          <div className="space-y-3">
            {Object.entries(orbSummary).slice(0, 8).map(([key, value]) => (
              <div key={key} className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3">
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-blue-700">{key.replaceAll('_', ' ')}</p>
                <p className="mt-1 text-sm font-bold leading-6 text-blue-950">{text(value)}</p>
              </div>
            ))}
            {!Object.keys(orbSummary).length ? <EmptyState title="No ORB summary returned" description="The governance ORB context endpoint did not return a summary for this session." /> : null}
          </div>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <Card>
          <SectionHeader eyebrow="Workforce" title="Health and stability" />
          <DataTable
            headers={['Signal', 'Value']}
            rows={[
              ['Role scope', workforceData.role_scope || 'self'],
              ['Open alerts', workforceData.alerts.length],
              ['Practice concerns', workforceData.practice_concerns.length],
              ['Wellbeing alerts', workforceData.wellbeing_alerts.length],
              ['Recognition', workforceData.recognition.length]
            ]}
            empty={<EmptyState title="No workforce summary" description="No workforce command-centre data was returned." />}
          />
        </Card>
        <Card>
          <SectionHeader eyebrow="Child journey" title="Journey and safeguarding" />
          <DataTable
            headers={['Signal', 'Value']}
            rows={[
              ['Chronology events', platformData.chronology.length],
              ['Safeguarding records', platformData.safeguarding.length],
              ['Open actions', platformData.actions.filter((action) => action.status !== 'completed').length],
              ['Evidence items', platformData.evidence.length],
              ['Documents', platformData.documents.length]
            ]}
            empty={<EmptyState title="No child journey summary" description="No child journey records were returned." />}
          />
        </Card>
        <Card>
          <SectionHeader eyebrow="Governance" title="Risk and readiness" />
          <DataTable
            headers={['Signal', 'Value']}
            rows={[
              ['Governance actions', governanceData.governance_actions.length],
              ['Unresolved concerns', governanceData.unresolved_concerns.length],
              ['Evidence matrix entries', count(governanceData.evidence_matrix?.entries)],
              ['Reg 44 visits', count(governanceData.reg44?.visits)],
              ['Feature flags', Object.keys(governanceData.feature_flags || {}).length]
            ]}
            empty={<EmptyState title="No governance summary" description="No governance command-centre data was returned." />}
          />
        </Card>
      </section>
    </div>
  )
}
