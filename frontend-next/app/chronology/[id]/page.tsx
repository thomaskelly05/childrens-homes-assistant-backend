import Link from 'next/link'

import { CitationList } from '@/components/indicare/citations/citation-list'
import { ActionsPanel, EvidenceItemsPanel } from '@/components/indicare/action-evidence-panels'
import { Card, PageHeader, SectionHeader, StatusBadge } from '@/components/indicare/ui'
import { QualityStandardBadges } from '@/components/indicare/workflows/quality-standard-badges'
import { RegulatoryWorkflowPanel } from '@/components/indicare/workflows/regulatory-workflow-panel'
import { getChronologyEventById, getChronologyEvents } from '@/lib/chronology/selectors'
import { getCareActions, getEvidenceItems } from '@/lib/evidence/selectors'
import { fullName, getStaffById, getYoungPersonById } from '@/lib/indicare/selectors'
import { mapEventToRegulatoryReferences } from '@/lib/regulatory-framework/mapping'

export default async function ChronologyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const event = getChronologyEventById(id)

  if (!event) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Chronology" title="Event not found" description="This chronology event is not in the current demo repository. Use the chronology workspace to select another event." action={<Link href="/chronology" className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white">Open chronology</Link>} />
      </div>
    )
  }

  const references = mapEventToRegulatoryReferences(event)
  const evidence = getEvidenceItems().filter((item) => event.evidenceIds.includes(item.id))
  const actions = getCareActions().filter((action) => event.actionIds.includes(action.id))
  const linkedPeople = event.youngPersonIds.map((personId) => getYoungPersonById(personId)).filter(Boolean)
  const linkedStaff = event.staffIds.map((staffId) => getStaffById(staffId)).filter(Boolean)
  const context = getChronologyEvents().filter((item) => item.id !== event.id && item.youngPersonIds.some((personId) => event.youngPersonIds.includes(personId))).slice(0, 4)
  const workflow = event.eventType === 'reg44_finding' ? 'reg44' : event.eventType === 'reg45_evidence' ? 'reg45' : event.eventType === 'lac_review' ? 'lac_review' : event.eventType === 'incident' || event.eventType === 'missing_episode' ? 'incident' : event.eventType === 'safeguarding' ? 'safeguarding' : 'daily_recording'

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Chronology event"
        title={event.title}
        description={`${new Date(event.dateTime).toLocaleString('en-GB')} · ${event.category} · ${event.summary}`}
        action={<Link href="/assistant" className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-500/30">Ask IndiCare about this</Link>}
      />
      <Card>
        <SectionHeader eyebrow="Workflow" title="Next operational steps" description="This is a clickable foundation; completion controls are placeholders until write APIs are connected." />
        <RegulatoryWorkflowPanel workflow={workflow} />
      </Card>
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]">
        <Card>
          <SectionHeader eyebrow="Record" title="What happened and why it matters" />
          <div className="flex flex-wrap gap-2">
            <StatusBadge value={event.eventType.replaceAll('_', ' ')} />
            <StatusBadge value={event.severity} />
            <StatusBadge value={event.visibility} />
          </div>
          <p className="mt-5 text-sm leading-7 text-slate-600">{event.fullText}</p>
          <div className="mt-5">
            <QualityStandardBadges references={references} />
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm leading-7 text-slate-600">
              <strong className="text-slate-950">Linked young person:</strong>{' '}
              {linkedPeople.map((person) => person ? <Link key={person.id} href={`/young-people/${person.id}`} className="font-black text-blue-700">{fullName(person)} </Link> : null)}
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm leading-7 text-slate-600">
              <strong className="text-slate-950">Linked staff:</strong> {linkedStaff.map((staff) => staff ? <Link key={staff.id} href={`/staff/${staff.id}`} className="font-black text-blue-700">{fullName(staff)} </Link> : null)}
            </div>
          </div>
          <div className="mt-6">
            <SectionHeader eyebrow="Traceability" title="Source citations" />
            <CitationList citations={[{ label: event.citationLabel, href: `/chronology/${event.id}`, sourceType: event.sourceType, sourceId: event.sourceId, sourceDate: new Date(event.dateTime).toLocaleDateString('en-GB'), staffName: linkedStaff.map((staff) => staff ? fullName(staff) : '').join(', '), youngPersonName: linkedPeople.map((person) => person ? fullName(person) : '').join(', '), confidence: event.regulationLinks.some((link) => link.confidence === 'direct') ? 'direct record' : 'supporting record', reviewRequired: event.tags.includes('manager-review') || event.tags.includes('overdue-manager-review'), excerpt: event.summary }]} />
          </div>
        </Card>
        <div className="space-y-6">
          <Card>
            <SectionHeader eyebrow="Actions" title="Linked action plan" />
            <ActionsPanel actions={actions} />
          </Card>
          <Card>
            <SectionHeader eyebrow="Evidence" title="Attached evidence" />
            <EvidenceItemsPanel evidence={evidence} />
          </Card>
          <Card>
            <SectionHeader eyebrow="Placeholders" title="Operational controls" />
            <div className="grid gap-2">
              <Link href="/reports" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black text-slate-700">Use in report</Link>
              <button className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm font-black text-slate-700">Mark reviewed placeholder</button>
              <button className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm font-black text-slate-700">Add evidence placeholder</button>
              <button className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm font-black text-slate-700">Create action placeholder</button>
            </div>
          </Card>
        </div>
      </section>
      <Card>
        <SectionHeader eyebrow="Chronology context" title="Related events" />
        <div className="grid gap-3 md:grid-cols-2">
          {context.map((item) => (
            <Link key={item.id} href={`/chronology/${item.id}`} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
              <strong className="block text-slate-950">{item.title}</strong>
              {item.summary}
            </Link>
          ))}
        </div>
      </Card>
    </div>
  )
}
