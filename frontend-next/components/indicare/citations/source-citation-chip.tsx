import Link from 'next/link'

export type SourceCitationChipProps = {
  label: string
  href?: string
  sourceDate?: string
  staffName?: string
  youngPersonName?: string
  confidence?: string
  reviewRequired?: boolean
}

export function SourceCitationChip({
  label,
  href,
  sourceDate,
  staffName,
  youngPersonName,
  confidence,
  reviewRequired
}: SourceCitationChipProps) {
  const content = (
    <span className="inline-flex max-w-full flex-col rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold leading-5 text-slate-600 shadow-sm transition hover:border-blue-200 hover:text-blue-700">
      <span className="truncate font-black text-slate-800">{label}</span>
      {[sourceDate, staffName, youngPersonName, confidence ? `Foundation: ${confidence}` : undefined, reviewRequired ? 'Review required' : undefined]
        .filter(Boolean)
        .join(' · ')}
    </span>
  )

  return href ? <Link href={href}>{content}</Link> : content
}
