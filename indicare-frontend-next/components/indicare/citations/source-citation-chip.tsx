import Link from 'next/link'

import { getEntityActions, resolveCitationRoute } from '@/lib/navigation/entity-resolver'

export type SourceCitationChipProps = {
  label: string
  href?: string
  sourceType?: string
  sourceId?: string
  sourceDate?: string
  staffName?: string
  youngPersonName?: string
  confidence?: string
  reviewRequired?: boolean
  excerpt?: string
}

export function SourceCitationChip({
  label,
  href,
  sourceType,
  sourceId,
  sourceDate,
  staffName,
  youngPersonName,
  confidence,
  reviewRequired,
  excerpt
}: SourceCitationChipProps) {
  const resolvedHref = href || (sourceType && sourceId ? resolveCitationRoute({ source_type: sourceType, source_id: sourceId }) : undefined)
  const actions = sourceType && sourceId
    ? getEntityActions({ entity_type: sourceType, entity_id: sourceId }).slice(0, 4)
    : []
  const content = (
    <span className="group relative inline-flex max-w-full flex-col rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold leading-5 text-slate-600 shadow-sm transition hover:border-blue-200 hover:text-blue-700">
      {resolvedHref ? <Link href={resolvedHref} className="absolute inset-0 rounded-2xl" aria-label={`Open source ${label}`} /> : null}
      <span className="truncate font-black text-slate-800">{label}</span>
      {[sourceDate, staffName, youngPersonName, confidence ? `Foundation: ${confidence}` : undefined, reviewRequired ? 'Review required' : undefined]
        .filter(Boolean)
        .join(' · ')}
      {excerpt ? <span className="mt-2 hidden rounded-xl bg-slate-50 p-2 text-[11px] font-semibold leading-5 text-slate-500 group-hover:block">{excerpt}</span> : null}
      {actions.length ? (
        <span className="relative z-10 mt-2 hidden flex-wrap gap-1 group-hover:flex">
          {actions.map((action) => (
            <Link key={`${action.id}-${action.route}`} href={action.route} className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-black text-slate-600">
              {action.id === 'workspace' ? 'Open source' : action.label}
            </Link>
          ))}
        </span>
      ) : null}
    </span>
  )

  return content
}
