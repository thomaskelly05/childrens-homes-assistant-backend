'use client'

import type { ReactNode } from 'react'

import { orbStudioClass, orbStudioComposerCardClass } from '@/components/orb/premium/orb-studio-theme'

export function OrbStudioComposerCard({
  label,
  children,
  className,
  footer
}: {
  label?: string
  children: ReactNode
  className?: string
  footer?: ReactNode
}) {
  return (
    <div className={orbStudioClass(orbStudioComposerCardClass, className)} data-orb-studio-composer-card>
      {label ? (
        <label className="mb-2 block text-xs font-medium text-[var(--orb-muted)]" data-orb-studio-composer-label>
          {label}
        </label>
      ) : null}
      {children}
      {footer ? <div className="mt-3 border-t border-[var(--orb-line)]/30 pt-3">{footer}</div> : null}
    </div>
  )
}
