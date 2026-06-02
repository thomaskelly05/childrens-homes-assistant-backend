'use client'

import type { ReactNode } from 'react'

import {
  OrbAppPanelShell,
  type OrbAppPanelMode,
  type OrbAppPanelSize
} from '@/components/orb-standalone/orb-app-panel-shell'
import { OrbWorkspaceFrame } from '@/components/orb-standalone/orb-workspace-frame'

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
  appModal,
  presentation
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
  layout?: 'drawer' | 'center' | 'workspace'
  modalSize?: OrbAppModalSize
  appModal?: boolean
  presentation?: 'modal' | 'workspace'
}) {
  if (layout === 'workspace' || presentation === 'workspace') {
    return (
      <OrbWorkspaceFrame
        open={open}
        title={title}
        subtitle={subtitle ?? (ariaLabel && ariaLabel !== title ? ariaLabel : undefined)}
        onClose={onClose}
        panelId={panelId}
        footer={footer}
      >
        {children}
      </OrbWorkspaceFrame>
    )
  }

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
