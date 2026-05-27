const toneClasses = {
  slate: 'border-slate-200 bg-slate-50 text-slate-700',
  blue: 'border-sky-100 bg-sky-50 text-sky-800',
  emerald: 'border-emerald-100 bg-emerald-50 text-emerald-800',
  amber: 'border-amber-100 bg-amber-50 text-amber-900',
  red: 'border-red-100 bg-red-50 text-red-800',
  violet: 'border-violet-100 bg-violet-50 text-violet-800'
} as const

export type StatusChipTone = keyof typeof toneClasses

export function StatusChip({ label, tone = 'slate' }: { label: string; tone?: StatusChipTone }) {
  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] ${toneClasses[tone]}`}>
      {label}
    </span>
  )
}

export function riskTone(level: string): StatusChipTone {
  const lower = level.toLowerCase()
  if (lower.includes('high') || lower.includes('critical') || lower.includes('urgent')) return 'red'
  if (lower.includes('medium') || lower.includes('moderate')) return 'amber'
  if (lower.includes('low')) return 'emerald'
  return 'slate'
}
