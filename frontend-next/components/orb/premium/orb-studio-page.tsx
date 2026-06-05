'use client'

import type { ReactNode } from 'react'

import { OrbPremiumAdvanced } from '@/components/orb/premium/orb-premium-advanced'
import { OrbPremiumTrustStrip } from '@/components/orb/premium/orb-premium-trust-strip'
import { cn } from '@/components/orb/premium/orb-premium-theme'
import { OrbStudioShell } from '@/components/orb/premium/orb-studio-shell'

/**
 * Premium studio page scaffold — replaces flat form stacks with layered studio layout.
 * Builds on OrbPremiumPage; use inside station panel shells.
 */
export function OrbStudioPage({
  studioId,
  hero,
  header,
  actionRail,
  trustStrip,
  trustTone,
  tabs,
  children,
  sidebar,
  primaryAction,
  secondary,
  advanced,
  footer,
  className,
  state
}: {
  studioId: string
  hero?: ReactNode
  header?: ReactNode
  actionRail?: ReactNode
  trustStrip?: ReactNode
  trustTone?: 'default' | 'safety' | 'muted'
  tabs?: ReactNode
  children: ReactNode
  sidebar?: ReactNode
  primaryAction?: ReactNode
  secondary?: ReactNode
  advanced?: ReactNode
  footer?: ReactNode
  className?: string
  state?: 'default' | 'loading' | 'error' | 'success' | 'working'
}) {
  return (
    <OrbStudioShell studioId={studioId} className={cn('gap-3 p-3 sm:gap-4 sm:p-4', className)} state={state}>
      <div
        className="flex min-h-0 flex-1 flex-col gap-3"
        data-orb-studio-page={studioId}
        {...{ [`data-orb-${studioId.replace(/_/g, '-')}-studio`]: true }}
      >
        {hero}
        {header}
        {trustStrip ? <OrbPremiumTrustStrip tone={trustTone}>{trustStrip}</OrbPremiumTrustStrip> : null}
        {actionRail}
        {tabs}

        <div
          className={cn('flex min-h-0 flex-1 gap-3', sidebar ? 'flex-col lg:flex-row' : 'flex-col')}
          data-orb-studio-page-body
        >
          <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">{children}</div>
          {sidebar ? (
            <aside className="flex min-h-0 shrink-0 flex-col gap-3 lg:w-[300px] xl:w-[320px]" data-orb-studio-sidebar>
              {sidebar}
            </aside>
          ) : null}
        </div>

        {secondary}
        {primaryAction ? (
          <div className="orb-studio-page-primary shrink-0" data-orb-studio-page-primary>
            {primaryAction}
          </div>
        ) : null}
        {advanced ? <OrbPremiumAdvanced>{advanced}</OrbPremiumAdvanced> : null}
        {footer ? (
          <footer className="shrink-0 text-[10px] leading-4 text-[var(--orb-muted)]" data-orb-studio-footer>
            {footer}
          </footer>
        ) : null}
      </div>
    </OrbStudioShell>
  )
}
