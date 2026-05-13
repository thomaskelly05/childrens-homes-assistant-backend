import Link from 'next/link'

import { ActionsPanel, EvidenceGapsPanel } from '@/components/indicare/action-evidence-panels'
import { Card, DataTable, EmptyState, PageHeader, SectionHeader, StatCard, StatusBadge } from '@/components/indicare/ui'
import { getDocumentsNeedingReview, getHomeDocuments, getRegulatoryDocuments } from '@/lib/documents/selectors'
import { getEvidenceGaps, getOpenCareActions } from '@/lib/evidence/selectors'
import { getStaffById } from '@/lib/indicare/selectors'

export default function DocumentsPage() {
  const documents = getHomeDocuments()
  const regulatoryDocuments = getRegulatoryDocuments()
  const reviewDocuments = getDocumentsNeedingReview()
  const reg44 = regulatoryDocuments.find((document) => document.documentType === 'reg44_report')

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Documents"
        title="Document library and regulatory upload foundation"
        description="Home documents can feed chronology, evidence gaps, action plans and draft reports. Upload and extraction controls are placeholders until real parsing is connected."
        action={<Link href="/documents/regulatory" className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-500/30">Regulatory documents</Link>}
      />
      <section className="grid gap-4 md:grid-cols-3">
        <StatCard label="Documents" value={documents.length} />
        <StatCard label="Regulatory documents" value={regulatoryDocuments.length} href="/documents/regulatory" />
        <StatCard label="Review/action plans" value={reviewDocuments.length} />
      </section>
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <Card>
          <SectionHeader eyebrow="Reg 44 upload" title="Upload or paste report text" description="Mock extraction converts findings into chronology links, staff actions and evidence requirements." />
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-[24px] border border-dashed border-blue-200 bg-blue-50/70 p-6">
              <h3 className="text-lg font-black text-blue-950">Upload placeholder</h3>
              <p className="mt-2 text-sm leading-7 text-blue-800">Drop PDF, Word or image report here when parsing is connected. Current build uses pasted/demo text only.</p>
              <button className="mt-5 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-black text-white">Choose file placeholder</button>
            </div>
            <div className="rounded-[24px] border border-slate-100 bg-slate-50/80 p-6">
              <h3 className="text-lg font-black text-slate-950">Paste/import text placeholder</h3>
              <p className="mt-2 text-sm leading-7 text-slate-600">{reg44?.extractedText || 'Paste independent visitor text to extract findings.'}</p>
              <button className="mt-5 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700">Run mock extraction</button>
            </div>
          </div>
          {reg44 ? (
            <div className="mt-6 space-y-3">
              {reg44.extractedFindings.map((finding) => (
                <article key={finding.id} className="rounded-2xl border border-slate-100 bg-white p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-amber-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-amber-700">{finding.severity}</span>
                    <span className="rounded-full bg-slate-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">{finding.regulation || 'Operational'}</span>
                  </div>
                  <h3 className="mt-3 text-sm font-black text-slate-950">{finding.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{finding.summary}</p>
                  <p className="mt-3 text-xs font-bold text-slate-500">Evidence required: {finding.evidenceRequired.join(', ')}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link href="/chronology" className="rounded-full border border-slate-200 px-3 py-2 text-xs font-black text-slate-600">Link finding to chronology</Link>
                    <Link href="/actions" className="rounded-full border border-slate-200 px-3 py-2 text-xs font-black text-slate-600">Link finding to staff action</Link>
                    <Link href="/evidence" className="rounded-full border border-slate-200 px-3 py-2 text-xs font-black text-slate-600">Link evidence</Link>
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </Card>
        <div className="space-y-6">
          <Card>
            <SectionHeader eyebrow="Evidence gaps" title="Gaps from documents" />
            <EvidenceGapsPanel gaps={getEvidenceGaps()} />
          </Card>
          <Card>
            <SectionHeader eyebrow="Actions generated" title="Document action plan" />
            <ActionsPanel actions={getOpenCareActions().filter((action) => ['reg44_report', 'reg45_evidence'].includes(action.sourceType))} />
          </Card>
        </div>
      </section>
      <Card>
        <SectionHeader eyebrow="Library" title="Documents" />
        <DataTable
          headers={['Title', 'Type', 'Regulation', 'Uploaded by', 'Uploaded', 'Review', 'Status', 'Tags']}
          rows={documents.map((document) => {
            const uploader = getStaffById(document.uploadedBy)
            return [
              <a key={document.id} href={document.fileUrl} className="font-black text-slate-950 hover:text-blue-700">{document.title}</a>,
              document.documentType.replaceAll('_', ' '),
              document.regulation || 'Care record',
              uploader?.firstName || document.uploadedBy,
              new Date(document.uploadedAt).toLocaleDateString('en-GB'),
              document.reviewRequiredBy || 'Not set',
              <StatusBadge key="status" value={document.status.replaceAll('_', ' ')} />,
              document.tags.join(', ')
            ]
          })}
          empty={<EmptyState title="No documents" description="No documents match your current filters." />}
        />
      </Card>
    </div>
  )
}
