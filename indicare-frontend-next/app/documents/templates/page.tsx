import { DocumentTemplateGrid } from '@/components/document-editor/template-grid'
import { PageHeader, StatCard } from '@/components/indicare/ui'
import { documentTemplates, templatesFor } from '@/lib/document-system/templates'

export default function DocumentTemplatesPage() {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Template registry" title="Therapeutic operational document templates" description="The registry defines scope, sections, prompts, evidence requirements, review frequency, sign-off and export profile for every working document type." />
      <section className="grid gap-4 md:grid-cols-3">
        <StatCard label="Child templates" value={templatesFor('child').length} />
        <StatCard label="Home templates" value={templatesFor('home').length} />
        <StatCard label="Staff templates" value={templatesFor('staff').length} />
      </section>
      <DocumentTemplateGrid templates={documentTemplates.map((template) => ({ ...template, href: template.scope === 'child' ? `/young-people?intent=document-template&template=${template.templateId}` : `/documents/new?scope=${template.scope}&template=${template.templateId}` }))} />
    </div>
  )
}
