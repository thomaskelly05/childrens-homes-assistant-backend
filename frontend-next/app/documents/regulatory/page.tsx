import Link from 'next/link'

import { ActionsPanel, EvidenceGapsPanel, EvidenceItemsPanel } from '@/components/indicare/action-evidence-panels'
import { LiveDataStatus } from '@/components/indicare/live-data-status'
import { Card, DataTable, EmptyState, PageHeader, SectionHeader, StatCard, StatusBadge } from '@/components/indicare/ui'
import { getOsActions } from '@/lib/os-api/actions'
import { getOsDocuments } from '@/lib/os-api/documents'
import { getOsEvidence } from '@/lib/os-api/evidence'

export default async function RegulatoryDocumentsPage() {
  const [documentsResult, actionsResult, evidenceResult] = await Promise.all([getOsDocuments(), getOsActions(), getOsEvidence()])
  const documents = documentsResult.data.filter((document) => ['reg44_report', 'reg45_report', 'inspection_report'].includes(document.documentType))
  const reg44Actions = actionsResult.data.filter((action) => action.regulation?.includes('44'))
  const reg44Gaps = reg44Actions
    .filter((action) => action.evidenceRequired.length && !action.evidenceIds.length)
    .map((action) => ({
      id: `reg44-action-evidence:${action.id}`,
      title: action.title,
      description: `Evidence required: ${action.evidenceRequired.join(', ')}`,
      regulation: action.regulation,
      priority: action.priority,
      youngPersonId: action.youngPersonId,
      sourceEventIds: action.sourceId ? [action.sourceId] : []
    }))
  const reg45Evidence = evidenceResult.data.filter((item) => item.linkedRegulation?.includes('45'))

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Regulatory documents"
        title="Reg 44 and Reg 45 document intelligence"
        description="Regulatory documents feed findings, actions, evidence requirements, chronology links and draft reporting from live OS records."
        action={<Link href="/documents" className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700">Back to documents</Link>}
      />
      <LiveDataStatus result={documentsResult} />
      <section className="grid gap-4 md:grid-cols-4">
        <StatCard label="Regulatory docs" value={documents.length} />
        <StatCard label="Reg 44 actions" value={reg44Actions.length} href="/actions" />
        <StatCard label="Reg 44 evidence required" value={reg44Gaps.length} href="/evidence" />
        <StatCard label="Reg 45 evidence" value={reg45Evidence.length} href="/reports" />
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
              document.uploadedBy || 'Not recorded',
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
            <EvidenceGapsPanel gaps={reg44Gaps} />
          </Card>
          <Card>
            <SectionHeader eyebrow="Reg 45 evidence" title="Quality of care evidence" />
            <EvidenceItemsPanel evidence={reg45Evidence} />
          </Card>
        </div>
      </section>
    </div>
  )
}
