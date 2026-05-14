import Link from 'next/link'
import { notFound } from 'next/navigation'

import { DocumentTemplateGrid } from '@/components/document-editor/template-grid'
import { PageHeader, StatCard } from '@/components/indicare/ui'
import { templatesFor } from '@/lib/document-system/templates'
import { getYoungPersonSummary } from '@/lib/indicare/selectors'

export default async function YoungPersonDocumentsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const summary = getYoungPersonSummary(id)
  if (!summary) notFound()
  const templates = templatesFor('child')

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Child documents"
        title={`${summary.youngPerson.preferredName}'s document workspace`}
        description="Editable child-centred documents with autosave, versions, review, evidence links, actions, signatures and Orb prompts scoped to this child only."
        action={<Link href={`/young-people/${id}/documents/new`} className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white">New document</Link>}
      />
      <section className="grid gap-4 md:grid-cols-3">
        <StatCard label="Templates" value={templates.length} />
        <StatCard label="Scope" value="Child" detail="Links stay inside this child record." />
        <StatCard label="Review" value="Manager QA" detail="Sign-off and audit-ready history." />
      </section>
      <DocumentTemplateGrid templates={templates} hrefFor={(template) => `/young-people/${id}/documents/new?template=${template.templateId}`} />
    </div>
  )
}
