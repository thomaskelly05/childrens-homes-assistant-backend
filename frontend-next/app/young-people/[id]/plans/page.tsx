import { notFound } from 'next/navigation'

import { DocumentTemplateGrid } from '@/components/document-editor/template-grid'
import { PageHeader } from '@/components/indicare/ui'
import { templatesFor } from '@/lib/document-system/templates'
import { getYoungPersonSummary } from '@/lib/indicare/selectors'

export default async function YoungPersonPlansPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const summary = getYoungPersonSummary(id)
  if (!summary) notFound()
  const templates = templatesFor('child').filter((template) => template.category === 'care_planning' || template.category === 'therapeutic_work')

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Plans" title={`${summary.youngPerson.preferredName}'s plans`} description="Care, placement, wellbeing, family, independence and support plans with linked evidence and manager review." />
      <DocumentTemplateGrid templates={templates.map((template) => ({ ...template, href: `/young-people/${id}/documents/new?template=${template.templateId}` }))} />
    </div>
  )
}
