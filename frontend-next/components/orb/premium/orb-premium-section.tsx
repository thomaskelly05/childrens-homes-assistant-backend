'use client'

import type { ReactNode } from 'react'

import { cn } from '@/components/orb/premium/orb-premium-theme'

export function OrbPremiumSection({
  title,
  description,
  children,
  className,
  collapsible = false,
  defaultOpen = true
}: {
  title?: string
  description?: string
  children: ReactNode
  className?: string
  collapsible?: boolean
  defaultOpen?: boolean
}) {
  if (collapsible) {
    return (
      <details
        className={cn('orb-premium-section', className)}
        data-orb-premium-section
        open={defaultOpen}
      >
        {title ? (
          <summary className="cursor-pointer text-xs font-semibold text-[var(--orb-muted)] hover:text-[var(--orb-foreground)]">
            {title}
          </summary>
        ) : null}
        {description ? <p className="mt-1 text-xs text-[var(--orb-muted)]">{description}</p> : null}
        <div className="mt-3 space-y-3">{children}</div>
      </details>
    )
  }

  return (
    <section className={cn('orb-premium-section space-y-3', className)} data-orb-premium-section>
      {title ? <h3 className="text-sm font-semibold text-[var(--orb-foreground)]">{title}</h3> : null}
      {description ? <p className="text-xs leading-relaxed text-[var(--orb-muted)]">{description}</p> : null}
      {children}
    </section>
  )
}
