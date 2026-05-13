import Link from 'next/link'
import { notFound } from 'next/navigation'

import { ActionsPanel, EvidenceItemsPanel } from '@/components/indicare/action-evidence-panels'
import { CitationList } from '@/components/indicare/citations/citation-list'
import { AlertCard, Card, PageHeader, RiskBadge, SectionHeader, StatusBadge } from '@/components/indicare/ui'
import { QualityStandardBadges } from '@/components/indicare/workflows/quality-standard-badges'
import { RegulatoryWorkflowPanel } from '@/components/indicare/workflows/regulatory-workflow-panel'
import { getChronologyEvents } from '@/lib/chronology/selectors'
import { getCareActions, getEvidenceItems } from '@/lib/evidence/selectors'
import { indicareData } from '@/lib/indicare/demo-data'
import { buildIncidentSummary } from '@/lib/indicare/reports'
import { fullName, getStaffById, getYoungPersonById } from '@/lib/indicare/selectors'
import { mapEventToRegulatoryReferences } from '@/lib/regulatory-framework/mapping'

export default async function IncidentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const incident = indicareData.incidents.find((item) => item.id === id)
  if (!incident) notFound()
  const person = getYoungPersonById(incident.youngPersonId)
  const sections = buildIncidentSummary(incident.id)
  const chronologyEvents = getChronologyEvents().filter((event) => event.sourceId === incident.id)
  const references = chronologyEvents.flatMap((event) => mapEventToRegulatoryReferences(event)).filter((reference, index, list) => list.findIndex((item) => item.id === reference.id) === index)
  const evidenceIds = new Set(chronologyEvents.flatMap((event) => event.evidenceIds))
  const actionIds = new Set(chronologyEvents.flatMap((event) => event.actionIds))
  const evidence = getEvidenceItems().filter((item) => evidenceIds.has(item.id))
  const actions = getCareActions().filter((action) => actionIds.has(action.id))

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Incident detail" title={incident.type} description={`${person?.preferredName || 'Young person'} · ${incident.location} · ${new Date(incident.dateTime).toLocaleString('en-GB')}`} action={<Link href="/assistant" className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-500/30">Assistant summary</Link>} />
      <Card>
        <SectionHeader eyebrow="Incident workflow" title="Recording, safeguarding and management oversight" />
        <RegulatoryWorkflowPanel workflow={incident.safeguardingRequired ? 'safeguarding' : 'incident'} />
      </Card>
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(300px,0.7fr)]">
        <Card>
          <SectionHeader eyebrow="Record" title="What happened" />
          <div className="flex flex-wrap gap-3">
            <RiskBadge value={incident.severity} />
            <StatusBadge value={incident.status} />
            {incident.safeguardingRequired ? <StatusBadge value="Safeguarding required" /> : null}
          </div>
          <div className="mt-6 space-y-5 text-sm leading-7 text-slate-600">
            <p><strong className="text-slate-950">Description:</strong> {incident.description}</p>
            <p><strong className="text-slate-950">Trigger:</strong> {incident.trigger}</p>
            <p><strong className="text-slate-950">De-escalation:</strong> {incident.deEscalationUsed.join(', ')}</p>
            <p><strong className="text-slate-950">Outcome:</strong> {incident.outcome}</p>
            <p><strong className="text-slate-950">Injuries:</strong> {incident.injuries}</p>
            <p><strong className="text-slate-950">Agencies:</strong> Police {incident.policeInvolved ? 'involved' : 'not involved'}, ambulance {incident.ambulanceInvolved ? 'involved' : 'not involved'}.</p>
          </div>
          <div className="mt-6">
            <QualityStandardBadges references={references} />
          </div>
        </Card>
        <Card>
          <SectionHeader eyebrow="Oversight" title="Follow-up and review" />
          <div className="space-y-3">
            {incident.followUpActions.map((action) => <AlertCard key={action} title="Follow-up action" body={action} />)}
            <AlertCard title="Manager review" body={incident.managerReview} />
          </div>
          <div className="mt-5 rounded-[22px] border border-slate-100 bg-slate-50/70 p-4 text-sm leading-6 text-slate-600">
            Staff involved: {incident.staffIds.map((staffId) => getStaffById(staffId)).filter(Boolean).map((staff) => staff ? fullName(staff) : '').join(', ')}
          </div>
        </Card>
      </section>
      <Card>
        <SectionHeader eyebrow="Assistant-ready draft" title="Structured incident summary" />
        <div className="grid gap-4 md:grid-cols-2">
          {sections.map((section) => <AlertCard key={section.title} title={section.title} body={section.body} />)}
        </div>
      </Card>
      <section className="grid gap-6 xl:grid-cols-2">
        <Card>
          <SectionHeader eyebrow="Evidence and actions" title="Operational follow-up" />
          <EvidenceItemsPanel evidence={evidence} />
          <div className="mt-5">
            <ActionsPanel actions={actions} />
          </div>
        </Card>
        <Card>
          <SectionHeader eyebrow="Traceability" title="Chronology citations" />
          <CitationList citations={chronologyEvents.map((event) => ({ label: event.citationLabel, href: `/chronology/${event.id}`, sourceDate: new Date(event.dateTime).toLocaleDateString('en-GB'), youngPersonName: person ? fullName(person) : undefined, reviewRequired: true }))} />
        </Card>
      </section>
    </div>
  )
}
