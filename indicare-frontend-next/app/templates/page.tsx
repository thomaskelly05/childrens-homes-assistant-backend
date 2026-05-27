import Link from 'next/link'
import { ClipboardList, FileText, ShieldCheck } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { Card, PageHeader, SectionHeader, StatusBadge } from '@/components/indicare/ui'
import { reportTemplates } from '@/lib/regulatory-reporting/templates'

const templateLinks: Array<[LucideIcon, string, string]> = [
  [ClipboardList, 'Reports', '/reports'],
  [ShieldCheck, 'Recording templates', '/young-people'],
  [FileText, 'Assistant templates', '/assistant/apps/templates']
]

export default function TemplatesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Templates"
        title="Care and reporting templates"
        description="Template navigation is controlled here while editable template libraries continue through reports and assistant apps."
        action={<Link href="/assistant/apps/templates" className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-500/30">Open assistant templates</Link>}
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Card>
          <SectionHeader eyebrow="Available now" title="Reviewed template routes" />
          <div className="grid gap-3 md:grid-cols-2">
            {reportTemplates.slice(0, 4).map((template) => (
              <article key={template.id} className="rounded-[24px] border border-slate-100 bg-slate-50 p-5">
                <div className="flex items-start justify-between gap-3">
                  <FileText className="h-5 w-5 text-blue-600" aria-hidden />
                  <StatusBadge value="Review required" />
                </div>
                <h2 className="mt-4 text-lg font-black tracking-[-0.03em] text-slate-950">{template.title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">{template.description}</p>
              </article>
            ))}
          </div>
        </Card>

        <div className="space-y-5">
          <Card>
            <SectionHeader eyebrow="Controlled limitation" title="No blank template editor yet" />
            <p className="text-sm leading-7 text-slate-600">Use reports for regulated drafts or assistant templates for standalone drafting. Nothing writes to care records without review.</p>
          </Card>
          <Card>
            <div className="grid gap-3">
              {templateLinks.map(([Icon, label, href]) => (
                <Link key={String(label)} href={String(href)} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-black text-slate-800 hover:border-blue-100 hover:bg-blue-50">
                  <Icon className="h-4 w-4 text-blue-600" aria-hidden />
                  {label}
                </Link>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
