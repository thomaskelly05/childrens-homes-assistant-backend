import Link from 'next/link'

import { getEntityActions, entityLinkSummary, type ResolvableEntity } from '@/lib/navigation/entity-resolver'

export function EntityPreviewCard({
  entity,
  title,
  description,
  compact = false
}: {
  entity: ResolvableEntity
  title?: string
  description?: string
  compact?: boolean
}) {
  const summary = entityLinkSummary(entity)
  const actions = getEntityActions(entity).slice(0, compact ? 3 : 6)

  return (
    <section className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{summary.link.label}</p>
      <h3 className="mt-2 text-base font-black text-slate-950">{title || summary.title}</h3>
      <p className="mt-2 text-xs leading-5 text-slate-500">{description || summary.description}</p>
      <div className="mt-4 grid gap-2">
        {actions.map((action) => (
          <Link
            key={`${action.id}-${action.route}`}
            href={action.route}
            className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs font-black text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
          >
            {action.label}
          </Link>
        ))}
      </div>
    </section>
  )
}
