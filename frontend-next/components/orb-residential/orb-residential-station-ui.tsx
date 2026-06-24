'use client'

import type { ReactNode } from 'react'

import { GlassOrbMark } from '@/components/orb-residential/ui/glass-orb-mark'
import { OrbPremiumTrustStrip } from '@/components/orb/premium/orb-premium-trust-strip'
import { OrbStudioEmptyState } from '@/components/orb/premium/orb-studio-empty-state'
import { OrbStudioHeader } from '@/components/orb/premium/orb-studio-header'
import { cn } from '@/components/orb/premium/orb-premium-theme'
import { ORB_STATION_SAFETY_FOOTER } from '@/lib/orb/orb-residential-station-copy'

export function OrbResidentialStationHeader({
  title,
  subtitle,
  stationId,
  badge,
  actions,
  className
}: {
  title: string
  subtitle?: string
  stationId?: string
  badge?: ReactNode
  actions?: ReactNode
  className?: string
}) {
  return (
    <header
      className={cn('orb-residential-station-header flex shrink-0 flex-col gap-3', className)}
      data-orb-residential-station-header
      {...(stationId ? { 'data-orb-residential-station': stationId } : {})}
    >
      <div className="flex min-w-0 items-start gap-3">
        <GlassOrbMark size="sm" pulse className="mt-0.5 shrink-0" aria-hidden />
        <div className="min-w-0 flex-1">
          <OrbStudioHeader title={title} subtitle={subtitle} badge={badge} actions={actions} className="!gap-1" />
        </div>
      </div>
    </header>
  )
}

export function OrbResidentialStationBadge({
  children,
  tone = 'default',
  className
}: {
  children: ReactNode
  tone?: 'default' | 'orb' | 'review'
  className?: string
}) {
  const toneClass =
    tone === 'review'
      ? 'border-amber-300/50 bg-amber-50 text-amber-900'
      : tone === 'orb'
        ? 'border-[var(--orb-primary)]/30 bg-[var(--orb-primary-soft)] text-[var(--orb-primary)]'
        : 'border-[var(--orb-line)]/40 bg-[var(--orb-surface-elevated)] text-[var(--orb-muted)]'

  return (
    <span
      className={cn(
        'orb-residential-station-badge inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
        toneClass,
        className
      )}
      data-orb-residential-station-badge
      data-orb-residential-station-badge-tone={tone}
    >
      {children}
    </span>
  )
}

export function OrbResidentialReviewRequiredBadge({ className }: { className?: string }) {
  return (
    <OrbResidentialStationBadge tone="review" className={className}>
      Review required
    </OrbResidentialStationBadge>
  )
}

export function OrbResidentialSaveStatusBadge({
  label,
  saved = false
}: {
  label: string
  saved?: boolean
}) {
  return (
    <span
      className={cn(
        'orb-residential-save-status inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-semibold',
        saved
          ? 'border-emerald-300/50 bg-emerald-50 text-emerald-800'
          : 'border-[var(--orb-line)]/40 bg-[var(--orb-surface)] text-[var(--orb-muted)]'
      )}
      data-orb-residential-save-status
      data-orb-residential-save-status-saved={saved ? true : undefined}
    >
      {label}
    </span>
  )
}

export function OrbResidentialPrimaryActionCard({
  children,
  className,
  dataAttr
}: {
  children: ReactNode
  className?: string
  dataAttr?: string
}) {
  return (
    <div
      className={cn(
        'orb-residential-primary-action-card rounded-2xl border border-[var(--orb-line)]/15 bg-gradient-to-b from-white to-[var(--orb-surface)]/80 p-5 shadow-sm',
        className
      )}
      data-orb-residential-primary-action-card
      {...(dataAttr ? { [`data-${dataAttr}`]: true } : {})}
    >
      {children}
    </div>
  )
}

export function OrbResidentialSecondaryActionChips({
  children,
  className,
  label
}: {
  children: ReactNode
  className?: string
  label?: string
}) {
  return (
    <div className={cn('orb-residential-secondary-chips', className)} data-orb-residential-secondary-chips>
      {label ? (
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--orb-muted)]">{label}</p>
      ) : null}
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  )
}

export function OrbResidentialSecondaryChip({
  children,
  active = false,
  onClick,
  dataAttr
}: {
  children: ReactNode
  active?: boolean
  onClick?: () => void
  dataAttr?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'orb-residential-secondary-chip rounded-full border px-3 py-1.5 text-xs font-medium transition',
        active
          ? 'border-[var(--orb-primary)]/40 bg-[var(--orb-primary-soft)] text-[var(--orb-foreground)]'
          : 'border-[var(--orb-line)]/30 bg-white/90 text-[var(--orb-muted)] hover:border-[var(--orb-primary)]/25 hover:text-[var(--orb-foreground)]'
      )}
      data-orb-residential-secondary-chip
      {...(dataAttr ? { [`data-${dataAttr}`]: true } : {})}
    >
      {children}
    </button>
  )
}

export function OrbResidentialSourceChip({ label }: { label: string }) {
  return (
    <span
      className="orb-residential-source-chip inline-flex rounded-full border border-[var(--orb-line)]/35 bg-[var(--orb-surface)] px-2 py-0.5 text-[10px] text-[var(--orb-muted)]"
      data-orb-residential-source-chip
    >
      {label}
    </span>
  )
}

export function OrbResidentialTemplateActionChip({
  label,
  active = false,
  onClick
}: {
  label: string
  active?: boolean
  onClick?: () => void
}) {
  return (
    <OrbResidentialSecondaryChip active={active} onClick={onClick} dataAttr="orb-residential-template-chip">
      {label}
    </OrbResidentialSecondaryChip>
  )
}

export function OrbResidentialSafetyFooter({
  children = ORB_STATION_SAFETY_FOOTER,
  tone = 'muted',
  className
}: {
  children?: ReactNode
  tone?: 'default' | 'safety' | 'muted'
  className?: string
}) {
  return (
    <OrbPremiumTrustStrip tone={tone} className={cn('orb-residential-safety-footer text-center', className)} data-orb-residential-safety-footer>
      {children}
    </OrbPremiumTrustStrip>
  )
}

export function OrbResidentialEmptyStateCard({
  icon,
  title,
  description,
  actions,
  className,
  dataAttr
}: {
  icon?: ReactNode
  title: string
  description?: string
  actions?: ReactNode
  className?: string
  dataAttr?: string
}) {
  return (
    <div data-orb-residential-empty-state={dataAttr || true}>
      <OrbStudioEmptyState
        icon={icon}
        title={title}
        description={description}
        actions={actions}
        className={cn('orb-residential-empty-state', className)}
      />
    </div>
  )
}

export function OrbResidentialStationPanel({
  stationId,
  children,
  className,
  variant = 'light'
}: {
  stationId: string
  children: ReactNode
  className?: string
  variant?: 'light' | 'dark'
}) {
  return (
    <section
      className={cn(
        'orb-residential-station-panel flex min-h-0 flex-1 flex-col gap-4',
        variant === 'dark' ? 'orb-residential-station-panel--dark' : 'orb-residential-station-panel--light',
        className
      )}
      data-orb-residential-station-panel
      data-orb-residential-station={stationId}
    >
      {children}
    </section>
  )
}

export function OrbResidentialMobileStationLayout({
  header,
  main,
  footer,
  className
}: {
  header?: ReactNode
  main: ReactNode
  footer?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn('orb-residential-mobile-station flex min-h-0 flex-1 flex-col', className)}
      data-orb-residential-mobile-station
    >
      {header ? <div className="shrink-0">{header}</div> : null}
      <div className="min-h-0 flex-1 overflow-y-auto">{main}</div>
      {footer ? <div className="shrink-0 pb-[max(0.5rem,env(safe-area-inset-bottom))]">{footer}</div> : null}
    </div>
  )
}
