import Link from 'next/link'

import { OrbGlassCard } from './orb-glass-card'

export function OrbCapabilityCard({
  title,
  href,
  subtle
}: {
  title: string
  href: string
  subtle?: boolean
}) {
  return (
    <Link href={href} data-orb-capability={title}>
      <OrbGlassCard
        className={`transition hover:border-sky-400/25 hover:bg-white/[0.06] ${subtle ? 'p-4' : ''}`}
      >
        <p className={`font-medium text-slate-200 ${subtle ? 'text-xs' : 'text-sm'}`}>{title}</p>
      </OrbGlassCard>
    </Link>
  )
}
