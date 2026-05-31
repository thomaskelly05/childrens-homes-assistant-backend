'use client'

import type { ReactNode } from 'react'

import {
  OrbStandalonePanelShell,
  type OrbAppModalSize
} from '@/components/orb-standalone/orb-standalone-panel-shell'

export type { OrbAppModalSize }

/**
 * ChatGPT-style centred app modal for ORB Residential stations.
 * Wraps the shared panel shell with fixed centre layout and size tokens.
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
  size = 'standard'
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
}) {
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

/** Props for station panels: centre modal on residential, drawer elsewhere. */
export function orbStationShellProps(residentialSurface: boolean | undefined, size: OrbAppModalSize = 'wide') {
  if (!residentialSurface) {
    return { layout: 'drawer' as const, wide: true }
  }
  return {
    layout: 'center' as const,
    modalSize: size,
    appModal: true,
    wide: size === 'wide' || size === 'standard'
  }
}
