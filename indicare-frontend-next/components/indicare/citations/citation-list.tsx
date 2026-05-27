import { SourceCitationChip, SourceCitationChipProps } from './source-citation-chip'

export function CitationList({ citations, empty = 'No source citations linked yet.' }: { citations: SourceCitationChipProps[]; empty?: string }) {
  if (!citations.length) {
    return <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-500">{empty}</p>
  }

  return (
    <div className="flex flex-wrap gap-2">
      {citations.map((citation, index) => (
        <SourceCitationChip key={`${citation.label}-${index}`} {...citation} />
      ))}
    </div>
  )
}
