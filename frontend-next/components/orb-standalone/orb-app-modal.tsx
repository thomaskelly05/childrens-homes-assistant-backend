'use client'

import type { ReactNode } from 'react'

import { OrbWorkspaceFrame } from '@/components/orb-standalone/orb-workspace-frame'
import {
  OrbStandalonePanelShell,
  type OrbAppModalSize
} from '@/components/orb-standalone/orb-standalone-panel-shell'

export type { OrbAppModalSize }

export type OrbAppPresentation = 'modal' | 'workspace'

/**
 * ORB app shell — centred modal for account/settings, or full main workspace on `/orb`.
 */
export function OrbAppModal({
  open,
  title,
  subtitle,
  onClose,
  children,
  footer,
  ariaLabel,
  panelId,
  size = 'standard',
  presentation = 'modal',
  compactChrome = false
}: {
  open: boolean
  title: string
  subtitle?: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  ariaLabel?: string
  panelId?: string
  size?: OrbAppModalSize
  presentation?: OrbAppPresentation
  compactChrome?: boolean
}) {
  if (presentation === 'workspace') {
    return (
      <OrbWorkspaceFrame
        open={open}
        title={title}
        subtitle={subtitle ?? (ariaLabel && ariaLabel !== title ? ariaLabel : undefined)}
        onClose={onClose}
        panelId={panelId}
        footer={footer}
        compactChrome={compactChrome}
      >
        {children}
      </OrbWorkspaceFrame>
    )
  }

  return (
    <OrbStandalonePanelShell
      open={open}
      title={title}
      subtitle={subtitle}
      onClose={onClose}
      footer={footer}
      ariaLabel={ariaLabel}
      panelId={panelId}
      layout="center"
      modalSize={size}
      appModal
    >
      {children}
    </OrbStandalonePanelShell>
  )
}

/** Props for station panels: main workspace on residential `/orb`, drawer elsewhere. */
export function orbStationShellProps(residentialSurface: boolean | undefined, size: OrbAppModalSize = 'wide') {
  if (!residentialSurface) {
    return { layout: 'drawer' as const, wide: true }
  }
  return {
    layout: 'workspace' as const,
    presentation: 'workspace' as const,
    compactChrome: true,
    wide: size === 'wide' || size === 'standard'
  }
}

/** Settings, profile and account overlays — drawer over current page, not main workspace swap. */
export function orbOverlayDrawerShellProps(size: OrbAppModalSize = 'wide') {
  return {
    layout: 'drawer' as const,
    wide: size === 'wide' || size === 'workstation' || size === 'standard',
    appModal: true
  }
}
