import Link from 'next/link'

import { ActionsPanel } from '@/components/indicare/action-evidence-panels'
import { CitationList } from '@/components/indicare/citations/citation-list'
import { Card, PageHeader, SectionHeader, StatusBadge } from '@/components/indicare/ui'
import { QualityStandardBadges } from '@/components/indicare/workflows/quality-standard-badges'
import { getChronologyEvents } from '@/lib/chronology/selectors'
import { getCareActions, getEvidenceItems } from '@/lib/evidence/selectors'
import { fullName, getStaffById, getYoungPersonById } from '@/lib/indicare/selectors'
import { mapEvidenceToRegulatoryReferences } from '@/lib/regulatory-framework/mapping'

export default async function EvidenceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const evidence = getEvidenceItems().find((item) => item.id === id)

  if (!evidence) {
    return <PageHeader eyebrow="Evidence" title="Evidence not found" description="This evidence item is not in the current demo register." action={<Link href="/evidence" className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white">Open evidence</Link>} />
  }

  const references = mapEvidenceToRegulatoryReferences(evidence)
  const actions = getCareActions().filter((action) => action.evidenceIds.includes(evidence.id) || action.sourceId === evidence.sourceId)
  const events = getChronologyEvents().filter((event) => event.evidenceIds.includes(evidence.id) || event.sourceId === evidence.sourceId)
  const person = getYoungPersonById(evidence.youngPersonId)
  const createdBy = getStaffById(evidence.createdBy)

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Evidence detail" title={evidence.title} description={evidence.description} action={<Link href="/assistant" className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white">Ask IndiCare about this</Link>} />
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <Card>
          <SectionHeader eyebrow="Evidence" title="Source, quality and regulatory alignment" />
          <div className="flex flex-wrap gap-2">
            <StatusBadge value={evidence.quality} />
            <StatusBadge value={evidence.evidenceType.replaceAll('_', ' ')} />
            <StatusBadge value={evidence.linkedRegulation || 'Operational evidence'} />
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <p className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm leading-7 text-slate-600"><strong className="text-slate-950">Linked child:</strong> {person ? <Link href={`/young-people/${person.id}`} className="font-black text-blue-700">{fullName(person)}</Link> : 'Home-wide'}</p>
            <p className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm leading-7 text-slate-600"><strong className="text-slate-950">Created by:</strong> {createdBy ? <Link href={`/staff/${createdBy.id}`} className="font-black text-blue-700">{fullName(createdBy)}</Link> : evidence.createdBy}</p>
            <p className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm leading-7 text-slate-600"><strong className="text-slate-950">Source:</strong> {evidence.sourceType} · {evidence.sourceId}</p>
            <p className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm leading-7 text-slate-600"><strong className="text-slate-950">Created:</strong> {new Date(evidence.createdAt).toLocaleString('en-GB')}</p>
          </div>
          <div className="mt-6">
            <QualityStandardBadges references={references} />
          </div>
        </Card>
        <div className="space-y-6">
          <Card>
            <SectionHeader eyebrow="Actions" title="Actions using this evidence" />
            <ActionsPanel actions={actions} />
          </Card>
          <Card>
            <SectionHeader eyebrow="Controls" title="Evidence placeholders" />
            <div className="grid gap-2">
              <Link href="/reports" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black text-slate-700">Use in report</Link>
              <button className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm font-black text-slate-700">Mark reviewed placeholder</button>
              <button className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm font-black text-slate-700">Create action placeholder</button>
            </div>
          </Card>
        </div>
      </section>
      <Card>
        <SectionHeader eyebrow="Traceability" title="Source citations and chronology context" />
        <CitationList citations={events.map((event) => ({ label: event.citationLabel, href: `/chronology/${event.id}`, sourceDate: new Date(event.dateTime).toLocaleDateString('en-GB'), youngPersonName: person ? fullName(person) : undefined, staffName: createdBy ? fullName(createdBy) : undefined, confidence: evidence.quality, reviewRequired: evidence.quality === 'review_required' }))} />
      </Card>
    </div>
  )
}
