import type { ReactNode } from 'react'

import { clsx } from 'clsx'

import { orbGlassCard } from './orb-theme'

export function OrbGlassCard({
  children,
  className,
  ...props
}: {
  children: ReactNode
  className?: string
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={clsx(orbGlassCard, 'p-5 sm:p-6', className)} {...props}>
      {children}
    </div>
  )
}
