import { notFound } from 'next/navigation'

import { DocumentTemplateGrid } from '@/components/document-editor/template-grid'
import { LiveDataStatus } from '@/components/indicare/live-data-status'
import { PageHeader } from '@/components/indicare/ui'
import { templatesFor } from '@/lib/document-system/templates'
import { getYoungPersonOverview } from '@/lib/os-api/platform'

export default async function YoungPersonRiskDocumentsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const overview = await getYoungPersonOverview(id)
  const person = overview.data.profile
  if (!person && overview.source === 'live') notFound()
  const childName = person?.preferredName || person?.displayName || `Young person ${id}`
  const templates = templatesFor('child').filter((template) => template.category === 'risk_assessment' || template.title.includes('Safety') || template.title.includes('Missing'))

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Risk assessments" title={`${childName}'s risk documents`} description="Risk documents remain child-scoped and connect to incidents, safeguarding, missing episodes, evidence and actions for this child only." />
      <LiveDataStatus result={overview} />
      <DocumentTemplateGrid templates={templates.map((template) => ({ ...template, href: `/young-people/${id}/documents/new?template=${template.templateId}` }))} />
    </div>
  )
}
