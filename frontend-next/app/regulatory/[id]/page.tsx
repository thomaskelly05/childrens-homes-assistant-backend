import Link from 'next/link'

import { ActionsPanel, EvidenceItemsPanel } from '@/components/indicare/action-evidence-panels'
import { CitationList } from '@/components/indicare/citations/citation-list'
import { Card, PageHeader, SectionHeader, StatusBadge } from '@/components/indicare/ui'
import { EvidenceGapCard } from '@/components/indicare/workflows/evidence-gap-card'
import { getChronologyEvents } from '@/lib/chronology/selectors'
import { getCareActions, getEvidenceItems } from '@/lib/evidence/selectors'
import { getRegulatoryCoverage, getRecordsLinkedToReference } from '@/lib/regulatory-framework/mapping'
import { frameworkLabel, getRegulatoryReferenceById } from '@/lib/regulatory-framework/selectors'

export default async function RegulatoryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const reference = getRegulatoryReferenceById(id)

  if (!reference) {
    return <PageHeader eyebrow="Regulatory framework" title="Reference not found" description="This regulatory reference is not in the current operational alignment layer." action={<Link href="/regulatory" className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white">Open framework</Link>} />
  }

  const coverage = getRegulatoryCoverage(getChronologyEvents(), getEvidenceItems(), getCareActions())
  const item = coverage.items.find((coverageItem) => coverageItem.reference.id === reference.id)
  const records = getRecordsLinkedToReference(reference.id)

  return (
    <div className="space-y-6">
      <PageHeader eyebrow={frameworkLabel(reference.framework)} title={`${reference.code}: ${reference.title}`} description={reference.summary} action={<Link href="/reports" className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white">Use in report</Link>} />
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <Card>
          <SectionHeader eyebrow="Operational meaning" title="Plain English alignment" />
          <p className="text-sm leading-7 text-slate-600">{reference.plainEnglish}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <StatusBadge value={reference.framework.replaceAll('_', ' ')} />
            <StatusBadge value={item?.evidenceStrength || 'review required'} />
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div>
              <h3 className="text-sm font-black uppercase tracking-[0.16em] text-slate-400">Good evidence looks like</h3>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">{reference.whatGoodEvidenceLooksLike.map((value) => <li key={value}>- {value}</li>)}</ul>
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-[0.16em] text-slate-400">Poor evidence looks like</h3>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">{reference.whatPoorEvidenceLooksLike.map((value) => <li key={value}>- {value}</li>)}</ul>
            </div>
          </div>
          <div className="mt-6">
            <SectionHeader eyebrow="Inspection prompts" title="Questions this should answer" />
            <div className="grid gap-2">
              {reference.inspectionPrompts.map((prompt) => <div key={prompt} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-600">{prompt}</div>)}
            </div>
          </div>
        </Card>
        <div className="space-y-6">
          {item ? (
            <Card>
              <SectionHeader eyebrow="Readiness indicator" title="Evidence position" />
              <EvidenceGapCard item={item} />
            </Card>
          ) : null}
          <Card>
            <SectionHeader eyebrow="Controls" title="Reference workflows" />
            <div className="grid gap-2">
              <Link href="/chronology" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black text-slate-700">Open linked chronology</Link>
              <Link href="/evidence" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black text-slate-700">Add evidence placeholder</Link>
              <Link href="/actions" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black text-slate-700">Create action placeholder</Link>
              <Link href="/assistant" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black text-slate-700">Ask IndiCare about this</Link>
            </div>
          </Card>
        </div>
      </section>
      <section className="grid gap-6 xl:grid-cols-2">
        <Card>
          <SectionHeader eyebrow="Linked evidence" title="Evidence and actions" />
          <EvidenceItemsPanel evidence={item?.evidence ?? []} />
          <div className="mt-5">
            <ActionsPanel actions={item?.actions ?? []} />
          </div>
        </Card>
        <Card>
          <SectionHeader eyebrow="Traceability" title="Linked records and citations" />
          <CitationList citations={records.map((record) => ({ label: record.citationLabel, href: record.href, sourceDate: new Date(record.date).toLocaleDateString('en-GB'), reviewRequired: item?.evidenceStrength === 'review_required' }))} />
        </Card>
      </section>
      <Card>
        <SectionHeader eyebrow="Report sections" title="Where this should be cited" />
        <div className="flex flex-wrap gap-2">
          {reference.reportSections.map((section) => <Link key={section} href="/reports" className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black text-slate-600">{section}</Link>)}
        </div>
      </Card>
    </div>
  )
}
