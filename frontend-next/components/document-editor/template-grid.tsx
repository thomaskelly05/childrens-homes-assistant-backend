import Link from 'next/link'

import type { DocumentTemplateSummary } from '@/lib/document-system/templates'

export function DocumentTemplateGrid({ templates, hrefFor }: { templates: DocumentTemplateSummary[]; hrefFor: (template: DocumentTemplateSummary) => string }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {templates.map((template) => (
        <Link key={template.templateId} href={hrefFor(template)} className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-600">{template.category.replaceAll('_', ' ')}</p>
          <h2 className="mt-3 text-xl font-black tracking-[-0.04em] text-slate-950">{template.title}</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">{template.description}</p>
          <p className="mt-4 text-xs font-black uppercase tracking-[0.14em] text-slate-500">Review: {template.reviewFrequency}</p>
        </Link>
      ))}
    </div>
  )
}
