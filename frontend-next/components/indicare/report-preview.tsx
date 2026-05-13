import { ReportSection } from '@/lib/indicare/types'

export function ReportPreview({ sections }: { sections: ReportSection[] }) {
  return (
    <div className="space-y-4">
      {sections.map((section) => (
        <article key={section.title} className="rounded-[22px] border border-slate-100 bg-slate-50/70 p-5">
          <h3 className="text-lg font-black tracking-[-0.03em] text-slate-950">{section.title}</h3>
          <p className="mt-3 text-sm leading-7 text-slate-600">{section.body}</p>
          {section.evidence.length ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {section.evidence.map((item) => <span key={item} className="rounded-full bg-white px-3 py-1.5 text-[11px] font-black text-slate-500 shadow-sm">{item}</span>)}
            </div>
          ) : null}
        </article>
      ))}
    </div>
  )
}
