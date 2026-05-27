'use client'

import { InspectionPackSectionView } from '@/components/inspection-readiness/inspection-pack-section'
import type { InspectionEvidencePack } from '@/lib/os-api/inspection-readiness'

type Props = { pack: InspectionEvidencePack | null; loading?: boolean }

export function InspectionPackViewer({ pack, loading }: Props) {
  if (loading) {
    return <p className="text-sm font-semibold text-slate-600">Generating evidence support pack…</p>
  }
  if (!pack) {
    return <p className="text-sm text-slate-500">Select a pack type and generate to review evidence sections.</p>
  }

  return (
    <div data-testid="inspection-pack-viewer" className="space-y-8">
      <div className="rounded-2xl border border-violet-100 bg-violet-50/60 px-4 py-3">
        <p className="text-sm font-semibold text-violet-950">{pack.summary}</p>
        <dl className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
          <div>
            <dt className="font-black uppercase text-violet-700">Evidence</dt>
            <dd className="text-lg font-black">{pack.evidence_count}</dd>
          </div>
          <div>
            <dt className="font-black uppercase text-amber-700">Gaps</dt>
            <dd className="text-lg font-black">{pack.gap_count}</dd>
          </div>
          <div>
            <dt className="font-black uppercase text-slate-600">Review needed</dt>
            <dd className="text-lg font-black">{pack.review_required_count}</dd>
          </div>
          <div>
            <dt className="font-black uppercase text-amber-800">Draft-only</dt>
            <dd className="text-lg font-black">{pack.draft_only_count}</dd>
          </div>
        </dl>
      </div>
      {pack.draft_only_count > 0 ? (
        <p
          data-testid="inspection-draft-only-warning"
          className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-950"
        >
          Draft-only items are not completed evidence. Manager review needed before including in visit or
          review packs.
        </p>
      ) : null}
      {pack.sections.map((section) => (
        <InspectionPackSectionView key={section.id} section={section} />
      ))}
      {pack.limitations.length ? (
        <ul className="list-disc space-y-1 pl-5 text-xs text-slate-600">
          {pack.limitations.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
