import { notFound } from 'next/navigation'

import { DocumentTemplateGrid } from '@/components/document-editor/template-grid'
import { LiveDataStatus } from '@/components/indicare/live-data-status'
import { PageHeader } from '@/components/indicare/ui'
import { templatesFor } from '@/lib/document-system/templates'
import { getYoungPersonOverview } from '@/lib/os-api/platform'

export default async function YoungPersonPlansPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const overview = await getYoungPersonOverview(id)
  const person = overview.data.profile
  if (!person && overview.source === 'live') notFound()
  const childName = person?.preferredName || person?.displayName || `Young person ${id}`
  const templates = templatesFor('child').filter((template) => template.category === 'care_planning' || template.category === 'therapeutic_work')

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Plans" title={`${childName}'s plans`} description="Care, placement, wellbeing, family, independence and support plans with linked evidence and manager review." />
      <LiveDataStatus result={overview} />
      <DocumentTemplateGrid templates={templates.map((template) => ({ ...template, href: `/young-people/${id}/documents/new?template=${template.templateId}` }))} />
    </div>
  )
}
