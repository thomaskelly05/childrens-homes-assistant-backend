'use client'

import type { HTMLAttributes, ReactNode } from 'react'

import { cn, orbPremiumPanelClass } from '@/components/orb/premium/orb-premium-theme'

export function OrbPremiumPanel({
  children,
  className,
  ...props
}: { children: ReactNode } & HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn(orbPremiumPanelClass, className)} data-orb-premium-panel {...props}>
      {children}
    </div>
  )
}
