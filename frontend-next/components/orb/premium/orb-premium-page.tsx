'use client'

import type { ReactNode } from 'react'

import { OrbPremiumAdvanced } from '@/components/orb/premium/orb-premium-advanced'
import { OrbPremiumHeader } from '@/components/orb/premium/orb-premium-header'
import { OrbPremiumPanel } from '@/components/orb/premium/orb-premium-panel'
import { OrbPremiumTrustStrip } from '@/components/orb/premium/orb-premium-trust-strip'
import { cn } from '@/components/orb/premium/orb-premium-theme'

/**
 * Standard inner layout for ORB station panels (inside OrbStandalonePanelShell).
 * Shell title/subtitle remain on the modal; use inline header only when embedded without shell.
 */
export function OrbPremiumPage({
  panelId,
  inlineHeader,
  trustStrip,
  trustTone,
  toolbar,
  tabs,
  children,
  primaryAction,
  secondary,
  advanced,
  footer,
  className
}: {
  panelId: string
  inlineHeader?: { title: string; subtitle?: string }
  trustStrip?: ReactNode
  trustTone?: 'default' | 'safety' | 'muted'
  toolbar?: ReactNode
  tabs?: ReactNode
  children: ReactNode
  primaryAction?: ReactNode
  secondary?: ReactNode
  advanced?: ReactNode
  footer?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn('orb-premium-page flex min-h-0 flex-1 flex-col gap-3 p-4 sm:p-5', className)}
      data-orb-premium-page={panelId}
      {...{ [`data-orb-${panelId.replace(/_/g, '-')}-panel`]: true }}
      {...(panelId === 'documents'
        ? { 'data-orb-document-panel': true, 'data-orb-knowledge-library': true }
        : {})}
      {...(panelId === 'saved_outputs' ? { 'data-orb-saved-outputs-panel': true } : {})}
    >
      {inlineHeader ? (
        <OrbPremiumHeader title={inlineHeader.title} subtitle={inlineHeader.subtitle} />
      ) : null}

      {trustStrip ? <OrbPremiumTrustStrip tone={trustTone}>{trustStrip}</OrbPremiumTrustStrip> : null}

      {toolbar}

      {tabs}

      <OrbPremiumPanel
        className="space-y-4"
        {...(panelId === 'documents'
          ? { 'data-orb-knowledge-library-body': true, 'data-orb-documents-content-scroll': true }
          : {})}
        {...(panelId === 'templates' ? { 'data-orb-template-list-scroll': true } : {})}
      >
        {children}
      </OrbPremiumPanel>

      {secondary}

      {primaryAction ? (
        <div className="orb-premium-page-primary shrink-0" data-orb-premium-page-primary>
          {primaryAction}
        </div>
      ) : null}

      {advanced ? <OrbPremiumAdvanced>{advanced}</OrbPremiumAdvanced> : null}

      {footer ? (
        <footer className="shrink-0 text-[10px] leading-4 text-[var(--orb-muted)]">{footer}</footer>
      ) : null}
    </div>
  )
}
