import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

import { OrbInlineHint } from '@/components/indicare/operational/orb-inline-hint'

export function CareHubMetricCard({
  label,
  value,
  detail,
  href,
  ariaLabel,
  orbHint
}: {
  label: string
  value: string | number
  detail: string
  href: string
  ariaLabel?: string
  orbHint?: { label: string; href: string }
}) {
  return (
    <article className="os-review-card group flex min-h-[96px] flex-col rounded-2xl border border-slate-100 bg-slate-50 transition hover:border-blue-200 hover:bg-blue-50/60">
      <Link
        href={href}
        aria-label={ariaLabel || `Open ${label}: ${value}. ${detail}`}
        className="flex flex-1 flex-col px-4 py-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 active:scale-[0.99]"
      >
        <div className="flex items-start justify-between gap-2">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">{label}</p>
          <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:text-blue-600" aria-hidden />
        </div>
        <p className="mt-1 text-lg font-black text-slate-950">{value}</p>
        <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">{detail}</p>
        <span className="mt-2 text-[10px] font-black uppercase tracking-[0.12em] text-blue-600 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
          Open
        </span>
      </Link>
      {orbHint ? (
        <div className="border-t border-slate-100/80 px-3 py-2">
          <OrbInlineHint label={orbHint.label} href={orbHint.href} tone="muted" />
        </div>
      ) : null}
    </article>
  )
}
