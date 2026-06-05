'use client'

import type { HTMLAttributes, ReactNode } from 'react'

import { cn } from '@/components/orb/premium/orb-premium-theme'

export function OrbPremiumActionBar({
  children,
  className,
  sticky,
  ...props
}: {
  children: ReactNode
  sticky?: boolean
} & HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'orb-premium-action-bar flex flex-wrap items-center gap-2',
        sticky && 'sticky bottom-0 z-10 border-t border-[var(--orb-line)]/40 bg-[var(--orb-surface)]/95 py-3 backdrop-blur-sm',
        className
      )}
      data-orb-premium-action-bar
      {...props}
    >
      {children}
    </div>
  )
}
