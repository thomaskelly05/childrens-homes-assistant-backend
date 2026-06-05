'use client'

import type { ReactNode } from 'react'

import { cn } from '@/components/orb/premium/orb-premium-theme'

export function OrbPremiumTrustStrip({
  children,
  tone = 'default',
  className
}: {
  children: ReactNode
  tone?: 'default' | 'safety' | 'muted'
  className?: string
}) {
  const toneClass =
    tone === 'safety'
      ? 'border-amber-400/25 bg-amber-500/8 text-amber-800 dark:text-amber-200/90'
      : tone === 'muted'
        ? 'border-[var(--orb-line)]/40 bg-[var(--orb-surface)]/60 text-[var(--orb-muted)]'
        : 'border-[var(--orb-line)]/50 bg-[var(--orb-surface-elevated)]/70 text-[var(--orb-muted)]'

  return (
    <div
      className={cn(
        'orb-premium-trust-strip rounded-xl border px-3 py-2 text-xs leading-relaxed',
        toneClass,
        className
      )}
      data-orb-premium-trust-strip
      data-orb-premium-trust-tone={tone}
    >
      {children}
    </div>
  )
}
