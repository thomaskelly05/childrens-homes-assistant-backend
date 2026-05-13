export function LifecycleStatusBadge({ status }: { status: string }) {
  const lower = status.toLowerCase()
  const tone = lower.includes('overdue') || lower.includes('blocked') || lower.includes('required')
    ? 'border-red-100 bg-red-50 text-red-700'
    : lower.includes('review') || lower.includes('draft')
      ? 'border-amber-100 bg-amber-50 text-amber-800'
      : 'border-emerald-100 bg-emerald-50 text-emerald-700'

  return <span className={`inline-flex rounded-full border px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.14em] ${tone}`}>{status}</span>
}

