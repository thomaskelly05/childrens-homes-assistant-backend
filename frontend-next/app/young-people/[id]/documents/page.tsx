import Link from 'next/link'
import { notFound } from 'next/navigation'

import { DocumentTemplateGrid } from '@/components/document-editor/template-grid'
import { LiveDataStatus } from '@/components/indicare/live-data-status'
import { Card, DataTable, EmptyState, PageHeader, SectionHeader, StatCard, StatusBadge } from '@/components/indicare/ui'
import { templatesFor } from '@/lib/document-system/templates'
import { getYoungPersonDocuments, getYoungPersonOverview } from '@/lib/os-api/platform'

export default async function YoungPersonDocumentsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [overview, documentsResult] = await Promise.all([getYoungPersonOverview(id), getYoungPersonDocuments(id)])
  const person = overview.data.profile
  if (!person && overview.source === 'live') notFound()
  const templates = templatesFor('child')
  const childName = person?.preferredName || person?.displayName || `Young person ${id}`
  const documents = documentsResult.data

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Child documents"
        title={`${childName}'s document workspace`}
        description="Uploaded documents, linked evidence, extraction status, review status and sign-off indicators where the backend returns them."
        action={<Link href={`/young-people/${id}/documents/new`} className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white">New document</Link>}
      />
      <LiveDataStatus result={documentsResult} />
      <section className="grid gap-4 md:grid-cols-3">
        <StatCard label="Templates" value={templates.length} />
        <StatCard label="Documents" value={documents.length} detail="Visible in live backend scope" />
        <StatCard label="Review required" value={documents.filter((document) => ['review_required', 'action_plan_open', 'processing'].includes(document.status)).length} detail="Review/sign-off queue" />
      </section>
      <Card>
        <SectionHeader eyebrow="Library" title="Linked documents" />
        <DataTable
          headers={['Title', 'Type', 'Status', 'Evidence links', 'Regulation']}
          rows={documents.map((document) => [
            <Link key={document.id} href={`/documents/${encodeURIComponent(document.id)}`} className="font-black text-slate-950 hover:text-blue-700">{document.title}</Link>,
            document.documentType.replaceAll('_', ' '),
            <StatusBadge key={document.id} value={document.status.replaceAll('_', ' ')} />,
            document.linkedEvidence.length,
            document.regulation || 'Not returned'
          ])}
          empty={<EmptyState title="No documents linked" description="No documents are visible for this child yet." />}
        />
      </Card>
      <DocumentTemplateGrid templates={templates} hrefFor={(template) => `/young-people/${id}/documents/new?template=${template.templateId}`} />
    </div>
  )
}
