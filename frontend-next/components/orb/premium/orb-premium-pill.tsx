'use client'

import type { ButtonHTMLAttributes, ReactNode } from 'react'

import { cn } from '@/components/orb/premium/orb-premium-theme'

export function OrbPremiumPill({
  active,
  children,
  className,
  ...props
}: {
  active?: boolean
  children: ReactNode
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cn(
        'orb-premium-pill rounded-full border px-3 py-1 text-xs font-medium transition',
        active
          ? 'border-[var(--orb-primary,#168bff)]/40 bg-[var(--orb-primary-soft,rgba(22,139,255,0.14))] text-[var(--orb-foreground)]'
          : 'border-[var(--orb-line)]/60 text-[var(--orb-muted)] hover:border-[var(--orb-primary)]/30 hover:text-[var(--orb-foreground)]',
        className
      )}
      data-orb-premium-pill
      data-orb-premium-pill-active={active ? 'true' : undefined}
      {...props}
    >
      {children}
    </button>
  )
}
