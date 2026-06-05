'use client'

import type { ReactNode } from 'react'

import { orbStudioClass, orbStudioActionRailClass } from '@/components/orb/premium/orb-studio-theme'

export function OrbStudioActionRail({
  children,
  className,
  helperText,
  disabled
}: {
  children: ReactNode
  className?: string
  helperText?: string
  disabled?: boolean
}) {
  return (
    <div className="space-y-1.5" data-orb-studio-action-rail-wrapper>
      <div
        className={orbStudioClass(orbStudioActionRailClass, disabled ? 'opacity-60' : undefined, className)}
        data-orb-studio-action-rail
        aria-disabled={disabled}
      >
        {children}
      </div>
      {helperText ? (
        <p className="px-1 text-[10px] text-[var(--orb-muted)]" data-orb-studio-action-rail-helper>
          {helperText}
        </p>
      ) : null}
    </div>
  )
}
