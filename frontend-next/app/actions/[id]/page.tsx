import Link from 'next/link'

import { CitationList } from '@/components/indicare/citations/citation-list'
import { EvidenceItemsPanel } from '@/components/indicare/action-evidence-panels'
import { Card, PageHeader, SectionHeader, StatusBadge } from '@/components/indicare/ui'
import { QualityStandardBadges } from '@/components/indicare/workflows/quality-standard-badges'
import { ManagementOversightPanel } from '@/components/indicare/workflows/management-oversight-panel'
import { getChronologyEvents } from '@/lib/chronology/selectors'
import { getCareActions, getEvidenceItems } from '@/lib/evidence/selectors'
import { fullName, getStaffById, getYoungPersonById } from '@/lib/indicare/selectors'
import { mapActionToRegulatoryReferences } from '@/lib/regulatory-framework/mapping'

export default async function ActionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const action = getCareActions().find((item) => item.id === id)

  if (!action) {
    return (
      <PageHeader eyebrow="Action" title="Action not found" description="This action is not in the current demo action register." action={<Link href="/actions" className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white">Open actions</Link>} />
    )
  }

  const references = mapActionToRegulatoryReferences(action)
  const evidence = getEvidenceItems().filter((item) => action.evidenceIds.includes(item.id))
  const events = getChronologyEvents().filter((event) => event.actionIds.includes(action.id) || event.sourceId === action.sourceId)
  const assignee = getStaffById(action.assignedToStaffId)
  const youngPerson = getYoungPersonById(action.youngPersonId)

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Action detail" title={action.title} description={action.description} action={<Link href="/assistant" className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white">Ask IndiCare about this</Link>} />
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <Card>
          <SectionHeader eyebrow="Action" title="Ownership, source and review status" />
          <div className="flex flex-wrap gap-2">
            <StatusBadge value={action.priority} />
            <StatusBadge value={action.status} />
            <StatusBadge value={action.regulation || 'Operational'} />
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <p className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm leading-7 text-slate-600"><strong className="text-slate-950">Owner:</strong> {assignee ? <Link href={`/staff/${assignee.id}`} className="font-black text-blue-700">{fullName(assignee)}</Link> : action.assignedToStaffId}</p>
            <p className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm leading-7 text-slate-600"><strong className="text-slate-950">Linked child:</strong> {youngPerson ? <Link href={`/young-people/${youngPerson.id}`} className="font-black text-blue-700">{fullName(youngPerson)}</Link> : 'Home-wide'}</p>
            <p className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm leading-7 text-slate-600"><strong className="text-slate-950">Due date:</strong> {action.dueDate}</p>
            <p className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm leading-7 text-slate-600"><strong className="text-slate-950">Source:</strong> {action.sourceType} · {action.sourceId}</p>
          </div>
          <div className="mt-6">
            <SectionHeader eyebrow="Regulatory links" title="Why this matters" />
            <QualityStandardBadges references={references} />
          </div>
          <div className="mt-6">
            <SectionHeader eyebrow="Evidence required" title="Completion evidence checklist" />
            <ul className="space-y-2">
              {action.evidenceRequired.map((item) => <li key={item} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-600">{item}</li>)}
            </ul>
          </div>
        </Card>
        <div className="space-y-6">
          <Card>
            <SectionHeader eyebrow="Evidence attached" title="Current evidence" />
            <EvidenceItemsPanel evidence={evidence} />
          </Card>
          <Card>
            <SectionHeader eyebrow="Controls" title="Action placeholders" />
            <div className="grid gap-2">
              <button className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm font-black text-slate-700">Mark reviewed placeholder</button>
              <button className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm font-black text-slate-700">Add evidence placeholder</button>
              <Link href="/reports" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black text-slate-700">Use in report</Link>
            </div>
          </Card>
        </div>
      </section>
      <Card>
        <SectionHeader eyebrow="Traceability" title="Source chronology and citations" />
        <CitationList citations={events.map((event) => ({ label: event.citationLabel, href: `/chronology/${event.id}`, sourceDate: new Date(event.dateTime).toLocaleDateString('en-GB'), youngPersonName: youngPerson ? fullName(youngPerson) : undefined, staffName: assignee ? fullName(assignee) : undefined, reviewRequired: action.status !== 'completed' }))} />
      </Card>
      <Card>
        <SectionHeader eyebrow="Management oversight" title="Review context" />
        <ManagementOversightPanel events={events} actions={[action]} />
      </Card>
    </div>
  )
}
