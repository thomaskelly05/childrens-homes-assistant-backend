'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'

import type { DocumentTemplateSummary } from '@/lib/document-system/templates'

export type DocumentTemplateGridItem = DocumentTemplateSummary & { href: string }

export function DocumentTemplateGrid({ templates }: { templates: DocumentTemplateGridItem[] }) {
  const [query, setQuery] = useState('')
  const filtered = useMemo(() => {
    const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean)
    if (!terms.length) return templates
    return templates.filter((template) => {
      const text = [template.templateId, template.title, template.scope, template.category, template.description, template.reviewFrequency, ...template.sections, ...template.prompts].join(' ').toLowerCase()
      return terms.every((term) => text.includes(term))
    })
  }, [query, templates])

  return (
    <div className="space-y-4">
      <label className="block rounded-[26px] border border-slate-200 bg-white p-4 shadow-sm">
        <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Search templates</span>
        <input value={query} onChange={(event) => setQuery(event.target.value)} className="mt-2 w-full bg-transparent text-lg font-black text-slate-950 outline-none" placeholder="Safeguarding, Reg 44, key work, medication..." />
      </label>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((template) => (
          <Link key={template.templateId} href={template.href} className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-600">{template.category.replaceAll('_', ' ')}</p>
            <h2 className="mt-3 text-xl font-black tracking-[-0.04em] text-slate-950">{template.title}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">{template.description}</p>
            <p className="mt-4 text-xs font-black uppercase tracking-[0.14em] text-slate-500">Review: {template.reviewFrequency}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
