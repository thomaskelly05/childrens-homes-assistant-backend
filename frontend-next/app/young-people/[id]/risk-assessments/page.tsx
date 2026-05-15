import { notFound } from 'next/navigation'

import { DocumentTemplateGrid } from '@/components/document-editor/template-grid'
import { PageHeader } from '@/components/indicare/ui'
import { templatesFor } from '@/lib/document-system/templates'
import { getYoungPersonSummary } from '@/lib/indicare/selectors'

export default async function YoungPersonRiskDocumentsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const summary = getYoungPersonSummary(id)
  if (!summary) notFound()
  const templates = templatesFor('child').filter((template) => template.category === 'risk_assessment' || template.title.includes('Safety') || template.title.includes('Missing'))

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Risk assessments" title={`${summary.youngPerson.preferredName}'s risk documents`} description="Risk documents remain child-scoped and connect to incidents, safeguarding, missing episodes, evidence and actions for this child only." />
      <DocumentTemplateGrid templates={templates} hrefFor={(template) => `/young-people/${id}/documents/new?template=${template.templateId}`} />
    </div>
  )
}
