'use client'

import type { ReactNode } from 'react'

import {
  OrbAppPanelShell,
  type OrbAppPanelMode,
  type OrbAppPanelSize
} from '@/components/orb-standalone/orb-app-panel-shell'

export type OrbAppModalSize = OrbAppPanelSize | 'xlarge' | 'fullscreenMobile'

const LEGACY_SIZE_MAP: Record<OrbAppModalSize, OrbAppPanelSize> = {
  compact: 'compact',
  standard: 'standard',
  wide: 'wide',
  workstation: 'workstation',
  xlarge: 'wide',
  fullscreenMobile: 'standard'
}

/**
 * @deprecated Prefer OrbAppPanelShell — kept for existing panels during migration.
 */
export function OrbStandalonePanelShell({
  open,
  title,
  subtitle,
  onClose,
  children,
  footer,
  ariaLabel,
  panelId,
  wide,
  layout = 'drawer',
  modalSize,
  appModal
}: {
  open: boolean
  title: string
  subtitle?: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  ariaLabel?: string
  panelId?: string
  wide?: boolean
  layout?: 'drawer' | 'center'
  modalSize?: OrbAppModalSize
  appModal?: boolean
}) {
  const isCenter = layout === 'center' || Boolean(appModal)
  const resolvedSize = modalSize ? LEGACY_SIZE_MAP[modalSize] : wide ? 'wide' : 'standard'
  const mode: OrbAppPanelMode = isCenter ? 'modal' : 'side'

  return (
    <OrbAppPanelShell
      appId={panelId || 'panel'}
      appModal={appModal}
      title={title}
      subtitle={subtitle ?? (ariaLabel && ariaLabel !== title ? ariaLabel : undefined)}
      open={open}
      onClose={onClose}
      mode={mode}
      size={resolvedSize}
      footer={footer}
      debugName={panelId}
    >
      {children}
    </OrbAppPanelShell>
  )
}
