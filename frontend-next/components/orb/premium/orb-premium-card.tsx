'use client'

import type { HTMLAttributes, ReactNode } from 'react'

import { cn, orbPremiumCardClass } from '@/components/orb/premium/orb-premium-theme'

export function OrbPremiumCard({
  children,
  className,
  padded = true,
  ...props
}: {
  children: ReactNode
  padded?: boolean
} & HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(orbPremiumCardClass, padded && 'p-4 sm:p-5', className)}
      data-orb-premium-card
      {...props}
    >
      {children}
    </div>
  )
}
