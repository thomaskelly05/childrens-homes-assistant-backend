'use client'

import type { ReactNode } from 'react'

import { cn, orbPremiumCardClass } from '@/components/orb/premium/orb-premium-theme'

export function OrbPremiumDocumentCard({
  title,
  meta,
  statusChip,
  footer,
  children,
  className,
  selected,
  ...props
}: {
  title: string
  meta?: ReactNode
  statusChip?: ReactNode
  footer?: ReactNode
  children?: ReactNode
  selected?: boolean
} & React.HTMLAttributes<HTMLElement>) {
  const Tag = 'article' as const

  return (
    <Tag
      className={cn(
        orbPremiumCardClass,
        'flex flex-col p-4 transition',
        selected && 'border-sky-400/40 ring-1 ring-sky-400/20',
        className
      )}
      data-orb-premium-document-card
      {...props}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--orb-foreground)]">{title}</p>
          {meta ? <div className="mt-1 text-xs text-[var(--orb-muted)]">{meta}</div> : null}
        </div>
        {statusChip ? <div className="shrink-0">{statusChip}</div> : null}
      </div>
      {children ? <div className="mt-2 text-xs leading-relaxed text-[var(--orb-muted)]">{children}</div> : null}
      {footer ? <div className="mt-3 flex flex-wrap gap-2 border-t border-[var(--orb-line)]/40 pt-3">{footer}</div> : null}
    </Tag>
  )
}
