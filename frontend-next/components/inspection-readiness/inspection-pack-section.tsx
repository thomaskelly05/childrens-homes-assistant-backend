'use client'

import { InspectionEvidenceCard } from '@/components/inspection evidence preparation/inspection-evidence-card'
import { InspectionGapCard } from '@/components/inspection evidence preparation/inspection-gap-card'
import type { InspectionPackSection } from '@/lib/os-api/inspection evidence preparation'

type Props = { section: InspectionPackSection }

export function InspectionPackSectionView({ section }: Props) {
  return (
    <section data-testid={`inspection-pack-section-${section.id}`} className="space-y-4">
      <div>
        <h3 className="text-lg font-black text-slate-950">{section.title}</h3>
        <p className="mt-1 text-sm text-slate-600">{section.summary}</p>
        {section.warnings.map((w) => (
          <p key={w} className="mt-2 text-xs font-semibold text-amber-800">
            {w}
          </p>
        ))}
      </div>
      {section.evidence_items.length ? (
        <div className="grid gap-3 md:grid-cols-2">
          {section.evidence_items.map((item) => (
            <InspectionEvidenceCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-500">No mapped evidence in this section — requires source review.</p>
      )}
      {section.gaps.length ? (
        <div className="space-y-2">
          <h4 className="text-xs font-black uppercase text-amber-800">Evidence gaps</h4>
          <div className="grid gap-3 md:grid-cols-2">
            {section.gaps.map((gap) => (
              <InspectionGapCard key={gap.id} gap={gap} />
            ))}
          </div>
        </div>
      ) : null}
    </section>
  )
}
