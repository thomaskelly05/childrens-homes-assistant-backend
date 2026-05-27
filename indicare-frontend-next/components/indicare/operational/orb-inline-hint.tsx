import Link from 'next/link'
import { Sparkles } from 'lucide-react'

export type OrbInlineHintTone = 'cyan' | 'blue' | 'muted'

const toneClasses: Record<OrbInlineHintTone, string> = {
  cyan: 'text-cyan-700 hover:text-cyan-900 bg-cyan-50/80 hover:bg-cyan-50 border-cyan-100/80',
  blue: 'text-blue-700 hover:text-blue-900 bg-blue-50/80 hover:bg-blue-50 border-blue-100/80',
  muted: 'text-slate-600 hover:text-slate-800 bg-slate-50/90 hover:bg-slate-100 border-slate-100'
}

export function OrbInlineHint({
  label,
  href,
  tone = 'cyan',
  icon: Icon = Sparkles,
  className = ''
}: {
  label: string
  href: string
  tone?: OrbInlineHintTone
  icon?: typeof Sparkles
  className?: string
}) {
  return (
    <Link
      href={href}
      data-testid="orb-inline-hint"
      className={`os-orb-hint inline-flex max-w-full items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 ${toneClasses[tone]} ${className}`.trim()}
    >
      <Icon className="h-3 w-3 shrink-0 opacity-80" aria-hidden />
      <span className="truncate">{label}</span>
    </Link>
  )
}
