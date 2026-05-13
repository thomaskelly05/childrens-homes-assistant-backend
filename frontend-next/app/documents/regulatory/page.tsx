import Link from 'next/link'

import { ActionsPanel, EvidenceGapsPanel, EvidenceItemsPanel } from '@/components/indicare/action-evidence-panels'
import { Card, DataTable, EmptyState, PageHeader, SectionHeader, StatCard, StatusBadge } from '@/components/indicare/ui'
import { getRegulatoryDocuments } from '@/lib/documents/selectors'
import { getEvidenceByRegulation, getEvidenceGapsByRegulation, getOpenCareActions } from '@/lib/evidence/selectors'
import { getStaffById } from '@/lib/indicare/selectors'

export default function RegulatoryDocumentsPage() {
  const documents = getRegulatoryDocuments()
  const reg44Actions = getOpenCareActions().filter((action) => action.regulation?.includes('44'))

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Regulatory documents"
        title="Reg 44 and Reg 45 document intelligence"
        description="Regulatory documents feed findings, actions, evidence requirements, chronology links and draft reporting. Extraction is deterministic demo data."
        action={<Link href="/documents" className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700">Back to documents</Link>}
      />
      <section className="grid gap-4 md:grid-cols-4">
        <StatCard label="Regulatory docs" value={documents.length} />
        <StatCard label="Reg 44 actions" value={reg44Actions.length} href="/actions" />
        <StatCard label="Reg 44 gaps" value={getEvidenceGapsByRegulation('44').length} href="/evidence" />
        <StatCard label="Reg 45 evidence" value={getEvidenceByRegulation('45').length} href="/reports" />
      </section>
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <Card>
          <SectionHeader eyebrow="Register" title="Regulatory documents needing oversight" />
          <DataTable
            headers={['Title', 'Type', 'Period', 'Uploaded by', 'Status', 'Findings']}
            rows={documents.map((document) => [
              <Link key={document.id} href={`/documents/${document.id}`} className="font-black text-slate-950 hover:text-blue-700">{document.title}</Link>,
              document.documentType.replaceAll('_', ' '),
              `${document.periodStart || 'Open'} to ${document.periodEnd || 'Open'}`,
              getStaffById(document.uploadedBy)?.firstName || document.uploadedBy,
              <StatusBadge key="status" value={document.status.replaceAll('_', ' ')} />,
              document.extractedFindings.length
            ])}
            empty={<EmptyState title="No regulatory documents" description="Upload or paste a Reg 44 or Reg 45 document to start extraction." />}
          />
        </Card>
        <div className="space-y-6">
          <Card>
            <SectionHeader eyebrow="Reg 44 action plan" title="Actions generated" />
            <ActionsPanel actions={reg44Actions} />
          </Card>
          <Card>
            <SectionHeader eyebrow="Reg 44 gaps" title="Evidence still required" />
            <EvidenceGapsPanel gaps={getEvidenceGapsByRegulation('44')} />
          </Card>
          <Card>
            <SectionHeader eyebrow="Reg 45 evidence" title="Quality of care evidence" />
            <EvidenceItemsPanel evidence={getEvidenceByRegulation('45')} />
          </Card>
        </div>
      </section>
    </div>
  )
}
