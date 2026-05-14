import { DocumentTemplateGrid } from '@/components/document-editor/template-grid'
import { PageHeader } from '@/components/indicare/ui'
import { templatesFor } from '@/lib/document-system/templates'

export default function StaffDocumentsPage() {
  const templates = templatesFor('staff')
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Staff documents" title="Confidential staff document system" description="Staff-scoped supervision, appraisal, induction, recruitment and training documents with role-based access and sign-off." />
      <DocumentTemplateGrid templates={templates} hrefFor={(template) => `/documents/new?scope=staff&template=${template.templateId}`} />
    </div>
  )
}
