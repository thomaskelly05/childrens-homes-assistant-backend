'use client'

import type { ReactNode } from 'react'

import { orbStudioClass, orbStudioShellClass } from '@/components/orb/premium/orb-studio-theme'

export function OrbStudioShell({
  studioId,
  children,
  className,
  state,
  ...rest
}: {
  studioId: string
  children: ReactNode
  className?: string
  state?: 'default' | 'loading' | 'error' | 'success' | 'working'
} & Record<string, unknown>) {
  return (
    <div
      className={orbStudioClass(
        orbStudioShellClass,
        state && state !== 'default' ? `orb-studio-state-${state}` : undefined,
        className
      )}
      data-orb-studio-shell={studioId}
      data-orb-studio-state={state ?? 'default'}
      {...rest}
    >
      {children}
    </div>
  )
}
