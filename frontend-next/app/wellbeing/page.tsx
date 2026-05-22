import Link from 'next/link'

import { LiveDataStatus } from '@/components/indicare/live-data-status'
import { CognitionPromptStack, OperationalBarChart, OperationalTrendChart, WellbeingRing } from '@/components/indicare/operational-cognition-widgets'
import { Card, DataTable, EmptyState, PageHeader, SectionHeader, StatusBadge } from '@/components/indicare/ui'
import { getCommandCentre } from '@/lib/os-api/platform'
import { getWorkforceCommandCentre } from '@/lib/os-api/workforce'
import { buildChronologyThemeData, buildChronologyTrendData, buildReflectivePrompts, buildWellbeingRings } from '@/lib/operational/cognition-metrics'

export default async function WellbeingPage() {
  const platform = await getCommandCentre()
  const workforce = await getWorkforceCommandCentre()
  const rings = buildWellbeingRings(platform.data, workforce.data)
  const trend = buildChronologyTrendData(platform.data.chronology)
  const themes = buildChronologyThemeData(platform.data.chronology)
  const prompts = buildReflectivePrompts(platform.data, {
    summary: {},
    inspection_readiness: {},
    governance_risk: {},
    workforce_health: {},
    safeguarding_drift: {},
    child_journey_health: {},
    governance_actions: [],
    unresolved_concerns: [],
    relational_stability: {},
    evidence_matrix: { summary: {}, entries: [] },
    reg44: {},
    reg45: {},
    provider_oversight: {},
    orb_governance_summary: {},
    feature_flags: {}
  }, workforce.data)

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Wellbeing"
        title="Child and workforce wellbeing posture"
        description="A live wellbeing hub using chronology, actions, safeguarding, evidence and Workforce OS alerts to make emotional safety visible without creating another data system."
        action={<Link href="/assistant/orb?context=wellbeing" className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-lg shadow-slate-950/20">Ask ORB</Link>}
      />
      <section className="grid gap-3 md:grid-cols-2">
        <LiveDataStatus result={platform} />
        <LiveDataStatus result={workforce} />
      </section>
      <section className="grid gap-4 lg:grid-cols-3">
        {rings.map((ring) => <WellbeingRing key={ring.label} {...ring} />)}
      </section>
      <section className="grid gap-6 xl:grid-cols-2">
        <OperationalTrendChart title="Wellbeing trajectory" description="Chronology volume and high-concern overlay from live OS chronology." data={trend} />
        <OperationalBarChart title="Therapeutic themes in records" data={themes} />
      </section>
      <CognitionPromptStack title="Reflective wellbeing prompts" prompts={prompts} action={<Link href="/chronology?view=wellbeing" className="rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-950">Open chronology</Link>} />
      <section className="grid gap-6 xl:grid-cols-2">
        <Card>
          <SectionHeader eyebrow="Workforce wellbeing" title="Support indicators" description="Signals come from the Workforce OS command-centre endpoint." />
          <DataTable
            headers={['Signal', 'Severity', 'Detail']}
            rows={workforce.data.wellbeing_alerts.map((alert, index) => [
              String(alert.title || alert.type || `Wellbeing alert ${index + 1}`),
              <StatusBadge key={index} value={String(alert.severity || 'review')} />,
              String(alert.detail || alert.summary || 'No detail returned')
            ])}
            empty={<EmptyState title="No workforce wellbeing alerts" description="The Workforce OS returned no wellbeing alerts for this role." />}
          />
        </Card>
        <Card>
          <SectionHeader eyebrow="Child emotional safety" title="Relevant chronology" description="Events with wellbeing, mood, regulation or settled language from live chronology." />
          <DataTable
            headers={['Event', 'Type', 'Summary']}
            rows={platform.data.chronology.filter((event) => /wellbeing|mood|emotion|regulation|settled/i.test(`${event.title} ${event.summary} ${event.fullText}`)).slice(0, 8).map((event) => [
              event.title,
              event.eventType.replaceAll('_', ' '),
              event.summary || 'No summary returned'
            ])}
            empty={<EmptyState title="No wellbeing chronology returned" description="No chronology rows currently contain visible wellbeing or regulation language." />}
          />
        </Card>
      </section>
    </div>
  )
}
