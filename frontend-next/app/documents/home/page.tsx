import { DocumentTemplateGrid } from '@/components/document-editor/template-grid'
import { PageHeader } from '@/components/indicare/ui'
import { templatesFor } from '@/lib/document-system/templates'

export default function HomeDocumentsPage() {
  const templates = templatesFor('home')
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Home documents" title="Home document system" description="Home-scoped policies, reports, risk assessments, QA records and improvement plans with review ownership and export controls." />
      <DocumentTemplateGrid templates={templates} hrefFor={(template) => `/documents/new?template=${template.templateId}`} />
    </div>
  )
}
