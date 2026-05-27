'use client'

import { Reg45EvidenceCard } from '@/components/reg45/reg45-evidence-card'
import { Reg45GapCard } from '@/components/reg45/reg45-gap-card'
import { Reg45ImprovementActions } from '@/components/reg45/reg45-improvement-actions'
import type { Reg45ReviewSection } from '@/lib/os-api/reg45-quality-review'

type Props = { section: Reg45ReviewSection }

export function Reg45ReviewSectionCard({ section }: Props) {
  return (
    <section data-testid={`reg45-section-${section.section_type}`} className="space-y-4 rounded-[24px] border border-slate-100 bg-white p-5 shadow-sm">
      <div>
        <h3 className="text-lg font-black text-slate-950">{section.title}</h3>
        <p className="mt-1 text-sm font-semibold text-slate-600">{section.summary}</p>
        {section.warnings?.length ? (
          <p className="mt-2 rounded-xl border border-amber-100 bg-amber-50/60 px-3 py-2 text-xs font-semibold text-amber-950">
            {section.warnings.join(' ')}
          </p>
        ) : null}
      </div>
      {section.evidence_items?.length ? (
        <div className="grid gap-3 md:grid-cols-2">
          {section.evidence_items.map((item) => (
            <Reg45EvidenceCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <p className="text-xs font-semibold text-slate-500">No mapped evidence in scope — potential gap.</p>
      )}
      {section.gaps?.length ? (
        <div className="grid gap-3 md:grid-cols-2">
          {section.gaps.map((gap) => (
            <Reg45GapCard key={gap.id} gap={gap} />
          ))}
        </div>
      ) : null}
      <Reg45ImprovementActions actions={section.improvement_actions || []} />
    </section>
  )
}
