import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

export function CareHubMetricCard({
  label,
  value,
  detail,
  href,
  ariaLabel
}: {
  label: string
  value: string | number
  detail: string
  href: string
  ariaLabel?: string
}) {
  return (
    <Link
      href={href}
      aria-label={ariaLabel || `Open ${label}: ${value}. ${detail}`}
      className="group flex min-h-[104px] flex-col justify-between rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 transition hover:border-blue-200 hover:bg-blue-50/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 active:scale-[0.99]"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">{label}</p>
        <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:text-blue-600" aria-hidden />
      </div>
      <p className="mt-1 text-lg font-black text-slate-950">{value}</p>
      <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">{detail}</p>
      <span className="mt-2 text-[10px] font-black uppercase tracking-[0.12em] text-blue-600 opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
        Open
      </span>
    </Link>
  )
}
