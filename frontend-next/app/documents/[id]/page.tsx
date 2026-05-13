import Link from 'next/link'

import { ActionsPanel, EvidenceItemsPanel } from '@/components/indicare/action-evidence-panels'
import { CitationList } from '@/components/indicare/citations/citation-list'
import { Card, PageHeader, SectionHeader, StatusBadge } from '@/components/indicare/ui'
import { QualityStandardBadges } from '@/components/indicare/workflows/quality-standard-badges'
import { RegulatoryWorkflowPanel } from '@/components/indicare/workflows/regulatory-workflow-panel'
import { getChronologyEvents } from '@/lib/chronology/selectors'
import { getHomeDocumentById } from '@/lib/documents/selectors'
import { getCareActions, getEvidenceItems } from '@/lib/evidence/selectors'
import { getStaffById, fullName } from '@/lib/indicare/selectors'
import { findRegulatoryReferences } from '@/lib/regulatory-framework/selectors'

export default async function DocumentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const document = getHomeDocumentById(id)

  if (!document) {
    return <PageHeader eyebrow="Document" title="Document not found" description="This document is not in the current demo document library." action={<Link href="/documents" className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white">Open documents</Link>} />
  }

  const uploader = getStaffById(document.uploadedBy)
  const actions = getCareActions().filter((action) => document.linkedActions.includes(action.id))
  const evidence = getEvidenceItems().filter((item) => document.linkedEvidence.includes(item.id))
  const events = getChronologyEvents().filter((event) => event.sourceId === document.id || document.extractedFindings.some((finding) => finding.chronologyEventId === event.id))
  const references = findRegulatoryReferences([document.regulation, document.documentType, document.title, ...document.tags].filter(Boolean).join(' '))
  const workflow = document.documentType === 'reg44_report' ? 'reg44' : document.documentType === 'reg45_report' ? 'reg45' : document.documentType === 'lac_review' ? 'lac_review' : 'manager_oversight'

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Document detail" title={document.title} description={`${document.documentType.replaceAll('_', ' ')} · ${document.status.replaceAll('_', ' ')}`} action={<Link href="/assistant" className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white">Ask IndiCare about this</Link>} />
      <Card>
        <SectionHeader eyebrow="Document workflow" title="Clickable regulatory workflow" />
        <RegulatoryWorkflowPanel workflow={workflow} />
      </Card>
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <Card>
          <SectionHeader eyebrow="Metadata" title="Source document and extracted foundation" />
          <div className="flex flex-wrap gap-2">
            <StatusBadge value={document.status.replaceAll('_', ' ')} />
            <StatusBadge value={document.regulation || 'Care record'} />
            <StatusBadge value={document.documentType.replaceAll('_', ' ')} />
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <p className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm leading-7 text-slate-600"><strong className="text-slate-950">Uploaded by:</strong> {uploader ? <Link href={`/staff/${uploader.id}`} className="font-black text-blue-700">{fullName(uploader)}</Link> : document.uploadedBy}</p>
            <p className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm leading-7 text-slate-600"><strong className="text-slate-950">Uploaded:</strong> {new Date(document.uploadedAt).toLocaleString('en-GB')}</p>
            <p className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm leading-7 text-slate-600"><strong className="text-slate-950">Period:</strong> {document.periodStart || 'Open'} to {document.periodEnd || 'Open'}</p>
            <p className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm leading-7 text-slate-600"><strong className="text-slate-950">Review by:</strong> {document.reviewRequiredBy || 'Not set'}</p>
          </div>
          <div className="mt-6">
            <QualityStandardBadges references={references} />
          </div>
          <div className="mt-6 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm leading-7 text-slate-600">
            {document.extractedText || 'No extracted text foundation is available yet. Upload or paste controls are placeholders in this sprint.'}
          </div>
        </Card>
        <div className="space-y-6">
          <Card>
            <SectionHeader eyebrow="Actions" title="Linked action plan" />
            <ActionsPanel actions={actions} />
          </Card>
          <Card>
            <SectionHeader eyebrow="Evidence" title="Linked evidence" />
            <EvidenceItemsPanel evidence={evidence} />
          </Card>
          <Card>
            <SectionHeader eyebrow="Controls" title="Document placeholders" />
            <div className="grid gap-2">
              <Link href="/reports" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black text-slate-700">Use in report</Link>
              <button className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm font-black text-slate-700">Create action placeholder</button>
              <button className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm font-black text-slate-700">Add evidence placeholder</button>
              <Link href="/reports" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black text-slate-700">Link to Reg 45 preparation</Link>
            </div>
          </Card>
        </div>
      </section>
      <Card>
        <SectionHeader eyebrow="Extracted findings" title="Findings, evidence requirements and SCCIF links" />
        <div className="grid gap-3 md:grid-cols-2">
          {document.extractedFindings.map((finding) => (
            <Link key={finding.id} href={finding.chronologyEventId ? `/chronology/${finding.chronologyEventId}` : `/documents/${document.id}`} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
              <StatusBadge value={finding.severity} />
              <h3 className="mt-3 font-black text-slate-950">{finding.title}</h3>
              <p className="mt-2">{finding.summary}</p>
              <p className="mt-2 text-xs font-black uppercase tracking-[0.14em] text-slate-500">{finding.evidenceRequired.join(', ')}</p>
            </Link>
          ))}
        </div>
      </Card>
      <Card>
        <SectionHeader eyebrow="Traceability" title="Linked chronology citations" />
        <CitationList citations={events.map((event) => ({ label: event.citationLabel, href: `/chronology/${event.id}`, sourceDate: new Date(event.dateTime).toLocaleDateString('en-GB'), staffName: uploader ? fullName(uploader) : undefined, reviewRequired: document.status === 'review_required' || document.status === 'action_plan_open' }))} />
      </Card>
    </div>
  )
}
