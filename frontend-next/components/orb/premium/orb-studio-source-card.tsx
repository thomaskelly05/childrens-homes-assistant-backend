'use client'

import type { ReactNode } from 'react'

import { orbStudioClass, orbStudioSourceCardClass } from '@/components/orb/premium/orb-studio-theme'

export function OrbStudioSourceCard({
  title,
  subtitle,
  chips,
  actions,
  selected,
  onClick,
  className
}: {
  title: string
  subtitle?: string
  chips?: ReactNode
  actions?: ReactNode
  selected?: boolean
  onClick?: () => void
  className?: string
}) {
  const Tag = onClick ? 'button' : 'div'

  return (
    <Tag
      type={onClick ? 'button' : undefined}
      className={orbStudioClass(orbStudioSourceCardClass, 'text-left', className)}
      data-orb-studio-source-card
      data-selected={selected ? 'true' : undefined}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-semibold text-[var(--orb-foreground)]">{title}</h4>
          {subtitle ? <p className="mt-0.5 text-xs text-[var(--orb-muted)]">{subtitle}</p> : null}
        </div>
        {actions}
      </div>
      {chips ? <div className="mt-2 flex flex-wrap gap-1">{chips}</div> : null}
    </Tag>
  )
}
