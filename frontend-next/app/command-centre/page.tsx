import Link from 'next/link'

import { LiveDataStatus } from '@/components/indicare/live-data-status'
import { CognitionPromptStack, OperationalBarChart, OperationalSignalGrid, OperationalTrendChart, WellbeingRing } from '@/components/indicare/operational-cognition-widgets'
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
  const signals = buildCommandCentreSignals(platformData, governanceData, workforceData)
  const pressureData = buildOperationalPressureData(platformData, governanceData, workforceData)
  const chronologyTrend = buildChronologyTrendData(platformData.chronology)
  const chronologyThemes = buildChronologyThemeData(platformData.chronology)
  const wellbeingRings = buildWellbeingRings(platformData, workforceData)
  const reflectivePrompts = buildReflectivePrompts(platformData, governanceData, workforceData)
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
  const recentIncidents = platformData.chronology.filter((event) => /incident|safeguarding|missing|restraint/i.test(`${event.category} ${event.title} ${event.summary}`)).slice(0, 6)
  const appointmentSignals = platformData.chronology.filter((event) => /appointment|meeting|review|health|school|professional/i.test(`${event.category} ${event.title} ${event.summary}`)).slice(0, 6)
  const medicationSignals = platformData.chronology.filter((event) => /medication|medicine|dose|health/i.test(`${event.category} ${event.title} ${event.summary}`)).slice(0, 6)
  const handoverSignals = platformData.chronology.filter((event) => /handover|shift|next shift/i.test(`${event.category} ${event.title} ${event.summary}`)).slice(0, 6)
  const openActions = platformData.actions.filter((action) => action.status !== 'completed')
  const dailyHomeRows = [
    ['Date', new Date().toLocaleDateString('en-GB')],
    ['Home', platformData.homes[0]?.title || 'No home returned'],
    ['Staff on shift', workforceData.alerts.length ? `${workforceData.alerts.length} workforce signal(s)` : 'No staff shift feed returned'],
    ['Children in home', platformData.children.length],
    ['Children away from home', recentIncidents.filter((event) => /missing|away/i.test(`${event.title} ${event.summary}`)).length],
    ['Appointments today', appointmentSignals.length],
    ['Medication alerts', medicationSignals.length],
    ['Incidents last 24h', recentIncidents.length],
    ['Safeguarding alerts', platformData.safeguarding.length],
    ['Outstanding actions', openActions.length]
  ]
  const positiveMoments = platformData.chronology.filter((event) => /settled|calm|positive|progress|achiev|trusted|enjoy|engaged/i.test(`${event.title} ${event.summary}`)).slice(0, 4)
  const relationshipSignals = platformData.chronology.filter((event) => /relationship|family|contact|keywork|trusted|repair|voice/i.test(`${event.title} ${event.summary}`)).slice(0, 4)
  const childrenNeedingAttention = platformData.children.filter((child) => /high|critical|attention|risk|concern/i.test(JSON.stringify(child))).length
  const unresolvedConcerns = count(governanceData.unresolved_concerns) + openActions.length + platformData.safeguarding.length
  const pulseRows = [
    ['Home atmosphere', recentIncidents.length || workforceData.alerts.length ? 'Pressure visible; review calmly' : 'No visible high-pressure signal returned'],
    ['Emotional stability', positiveMoments[0]?.summary || 'No positive or stabilising chronology returned yet'],
    ['Safeguarding pressure', platformData.safeguarding.length ? `${platformData.safeguarding.length} safeguarding signal(s)` : 'No open safeguarding signal returned'],
    ['Staffing pressure', workforceData.alerts.length ? `${workforceData.alerts.length} workforce alert(s)` : 'No workforce alert returned'],
    ['Positive progress', positiveMoments.length ? positiveMoments.map((event) => event.title).join(', ') : 'No positive progress markers returned'],
    ['Relationship stability', relationshipSignals.length ? relationshipSignals.map((event) => event.title).join(', ') : 'No relationship chronology returned'],
    ['Children needing attention', childrenNeedingAttention],
    ['Unresolved concerns', unresolvedConcerns]
  ]
  const pulseQuestions = [
    ['What changed today?', platformData.chronology[0]?.summary || 'No chronology event has been returned for today yet.'],
    ['What may need review?', operationalAlerts[0]?.evidence || 'No consolidated review alert returned.'],
    ['What support appears effective?', positiveMoments[0]?.summary || 'Look for daily notes showing calm, engagement, repair or progress.'],
    ['What should the next shift understand?', handoverSignals[0]?.summary || openActions[0]?.title || 'No handover-specific signal returned yet.'],
    ['What may Ofsted ask about?', text(governanceSummary.inspection_readiness || orbSummary.inspection_readiness || governanceData.evidence_matrix.entries[0]?.gap, 'No inspection readiness question returned.')],
    ['What remains unresolved?', operationalAlerts[0]?.title || openActions[0]?.title || (unresolvedConcerns ? `${unresolvedConcerns} concern(s) need review` : 'No unresolved concern returned.')]
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Unified command centre"
        title="Operational heartbeat of the home"
        description="A calm live view of atmosphere, safeguarding posture, child wellbeing trajectories, workforce pressure, chronology themes, inspection readiness and ORB reflective prompts."
        action={<Link prefetch={false} href="/orb?context=command-centre" className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-lg shadow-slate-950/20">Ask ORB about this view</Link>}
      />

      <section className="grid gap-3 md:grid-cols-3">
        <LiveDataStatus result={platform} />
        <LiveDataStatus result={governance} />
        <LiveDataStatus result={workforce} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(340px,0.9fr)]">
        <Card>
          <SectionHeader eyebrow="Care Hub daily home view" title="Today’s operational snapshot" description="Auto-composed from existing chronology, actions, safeguarding, evidence, workforce and governance feeds. No separate daily system is created." />
          <DataTable
            headers={['Field', 'Live value']}
            rows={dailyHomeRows}
            empty={<EmptyState title="No daily home view" description="Live operating data was not returned for this role." />}
          />
          <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-bold leading-6 text-blue-900">
            ORB daily briefing uses this same operational context: recent incidents, actions, missing or away-from-home signals, medication and health alerts, staffing, chronology and governance gaps.
          </div>
        </Card>

        <Card>
          <SectionHeader eyebrow="Shift handover" title="Continuity for the next adults" description="Handover remains linked to source child records, chronology, actions, safeguarding and reports." />
          <DataTable
            headers={['Signal', 'Summary']}
            rows={[
              ['Handover records', handoverSignals.length],
              ['Emotional atmosphere', reflectivePrompts[0] || 'No reflective prompt returned'],
              ['Risks to know', recentIncidents[0]?.summary || 'No recent risk chronology returned'],
              ['Actions outstanding', openActions[0]?.title || 'No open action returned'],
              ['Manager notes', governanceData.governance_actions[0]?.action || governanceData.governance_actions[0]?.title || 'No manager action returned']
            ]}
            empty={<EmptyState title="No handover data" description="No chronology, action or governance records are available for handover yet." />}
          />
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href="/young-people" className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white">Choose child for handover</Link>
            <Link href="/handover/current" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700">Open current handover</Link>
          </div>
        </Card>
      </section>

      <OperationalSignalGrid signals={signals} />

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(340px,0.95fr)]" data-testid="care-hub-operational-pulse">
        <Card>
          <SectionHeader eyebrow="Care Hub operational pulse" title="Atmosphere, pressure and stabilising signals" description="One visible atmosphere model assembled from existing chronology, safeguarding, actions, governance and workforce feeds." />
          <DataTable
            headers={['Signal', 'Existing source summary']}
            rows={pulseRows}
            empty={<EmptyState title="No operational pulse returned" description="Existing operational feeds did not return enough data to describe the pulse." />}
          />
        </Card>

        <Card>
          <SectionHeader eyebrow="Next shift intelligence" title="Reflective handover questions" description="Care Hub surfaces what changed, what needs review and what appears to help without creating a separate dashboard engine." />
          <div className="space-y-3">
            {pulseQuestions.map(([question, answer]) => (
              <div key={question} className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3">
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-blue-700">{question}</p>
                <p className="mt-1 text-sm font-bold leading-6 text-blue-950">{answer}</p>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <OperationalTrendChart title="Child wellbeing and chronology trajectory" description="Monthly live chronology volume with high-concern events overlaid as the secondary signal." data={chronologyTrend} />
        <div className="grid gap-4">
          {wellbeingRings.map((ring) => <WellbeingRing key={ring.label} {...ring} />)}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <OperationalBarChart title="Pressure by operational domain" data={pressureData} />
        <OperationalBarChart title="Meaningful chronology themes" data={chronologyThemes} />
      </section>

      <CognitionPromptStack
        title="RM reflective prompts"
        prompts={reflectivePrompts}
        action={<Link prefetch={false} href="/orb?context=command-centre" className="rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-950">Ask ORB</Link>}
      />

      <section className="grid gap-4 md:grid-cols-4 xl:grid-cols-8">
        <StatCard label="Children" value={platformData.children.length} detail="Visible child records" href="/young-people" />
        <StatCard label="Child journey health" value={text(governanceSummary.child_journey_health, platformData.chronology.length)} detail="Backend summary or chronology coverage" href="/chronology" />
        <StatCard label="Workforce health" value={text(governanceSummary.workforce_health, workforceData.alerts.length)} detail={`${workforceData.wellbeing_alerts.length} wellbeing alerts`} href="/staff/command-centre" />
        <StatCard label="Governance risk" value={text(governanceSummary.governance_risk, 'Review')} detail={`Score ${text(governanceSummary.governance_score, 'not returned')}`} href="/governance/command-centre" />
        <StatCard label="Safeguarding" value={platformData.safeguarding.length} detail="Open and recent safeguarding records" href="/safeguarding" />
        <StatCard label="Relational stability" value={text(governanceSummary.relational_stability, 'Review')} detail="Backend relationship signal" href="/staff/relationships" />
        <StatCard label="Inspection" value={text(governanceSummary.inspection_readiness, 'Review')} detail="Evidence gaps and review signals" href="/ofsted-readiness" />
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
