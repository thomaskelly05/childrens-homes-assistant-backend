'use client'

import type { ReactNode } from 'react'

import { cn } from '@/components/orb/premium/orb-premium-theme'

export function OrbStudioGrid({
  children,
  columns = 2,
  className
}: {
  children: ReactNode
  columns?: 1 | 2 | 3 | 4
  className?: string
}) {
  const colClass =
    columns === 1
      ? 'grid-cols-1'
      : columns === 3
        ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
        : columns === 4
          ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
          : 'grid-cols-1 sm:grid-cols-2'

  return (
    <div className={cn('orb-studio-grid grid gap-3', colClass, className)} data-orb-studio-grid>
      {children}
    </div>
  )
}
