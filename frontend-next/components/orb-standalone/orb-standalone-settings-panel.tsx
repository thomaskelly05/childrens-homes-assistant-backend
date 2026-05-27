'use client'

import type { ReactNode } from 'react'
import { Accessibility, Brain, Lock, Map, Mic, Settings, Shield } from 'lucide-react'

import { OrbAppearanceControl } from '@/components/orb-standalone/orb-appearance-control'
import { OrbStandalonePanelShell } from '@/components/orb-standalone/orb-standalone-panel-shell'
import type { OrbAppearanceMode } from '@/lib/orb/orb-appearance'

type SettingsItem = {
  id: string
  label: string
  description: string
  status?: string
  icon: ReactNode
  onClick: () => void
}

export function OrbStandaloneSettingsPanel({
  open,
  onClose,
  onOpenMemory,
  onOpenAccessibility,
  onOpenPermissions,
  onOpenVoiceSettings,
  onOpenIntelligenceMap,
  appearanceMode = 'light',
  onAppearanceChange
}: {
  open: boolean
  onClose: () => void
  onOpenMemory?: () => void
  onOpenAccessibility?: () => void
  onOpenPermissions?: () => void
  onOpenVoiceSettings?: () => void
  onOpenIntelligenceMap?: () => void
  appearanceMode?: OrbAppearanceMode
  onAppearanceChange?: (mode: OrbAppearanceMode) => void
}) {
  const items: SettingsItem[] = [
    {
      id: 'memory',
      label: 'Memory',
      description: 'Local workspace counts and export',
      status: 'On this device',
      icon: <Brain className="h-4 w-4 text-violet-300" aria-hidden />,
      onClick: () => onOpenMemory?.()
    },
    {
      id: 'accessibility',
      label: 'Accessibility',
      description: 'Reading, contrast and sensory options',
      status: 'localStorage',
      icon: <Accessibility className="h-4 w-4 text-cyan-300" aria-hidden />,
      onClick: () => onOpenAccessibility?.()
    },
    {
      id: 'voice',
      label: 'Voice',
      description: 'ORB Voice app — coming next (text chat is default on /orb)',
      status: 'Coming next',
      icon: <Mic className="h-4 w-4 text-slate-400" aria-hidden />,
      onClick: () => onOpenVoiceSettings?.()
    },
    {
      id: 'permissions',
      label: 'Permissions',
      description: 'Microphone, camera and upload readiness',
      status: 'Device',
      icon: <Lock className="h-4 w-4 text-slate-400" aria-hidden />,
      onClick: () => onOpenPermissions?.()
    },
    {
      id: 'privacy',
      label: 'Privacy',
      description: 'Standalone boundary — no OS record access',
      status: 'Protected',
      icon: <Shield className="h-4 w-4 text-emerald-300" aria-hidden />,
      onClick: () => {}
    },
    {
      id: 'intelligence_map',
      label: 'Intelligence map',
      description: 'Capability parity and planned surfaces',
      status: 'Overview',
      icon: <Map className="h-4 w-4 text-cyan-300" aria-hidden />,
      onClick: () => onOpenIntelligenceMap?.()
    },
    {
      id: 'appearance',
      label: 'Appearance',
      description: 'Light, dark or match system',
      status: appearanceMode,
      icon: <Settings className="h-4 w-4 text-[#00B8FF]" aria-hidden />,
      onClick: () => {}
    }
  ]

  return (
    <OrbStandalonePanelShell
      open={open}
      title="Settings"
      subtitle="Standalone ORB — privacy and comfort"
      onClose={onClose}
      ariaLabel="ORB settings"
      panelId="settings"
      footer="Standalone ORB does not access IndiCare OS records."
    >
      <div className="space-y-4 p-4" data-orb-settings-panel>
        <OrbAppearanceControl value={appearanceMode} onChange={(mode) => onAppearanceChange?.(mode)} />

        <div className="rounded-xl border border-[var(--orb-line)] bg-[var(--orb-surface)] px-3 py-2.5" data-orb-settings-privacy>
          <p className="flex items-center gap-2 text-[11px] font-medium text-[var(--orb-foreground)]">
            <Shield className="h-3.5 w-3.5 shrink-0" aria-hidden />
            Privacy
          </p>
          <p className="mt-1 text-[11px] leading-5 text-[var(--orb-muted)]">
            Standalone ORB does not call IndiCare OS APIs or read child, staff or home records. Export your local
            workspace from Memory if you need a backup.
          </p>
        </div>

        <ul className="grid gap-2">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => {
                  if (item.id === 'privacy' || item.id === 'appearance') return
                  item.onClick()
                  onClose()
                }}
                className="orb-panel-card flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left transition hover:bg-[var(--orb-surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#00B8FF]/40"
                data-orb-settings-card={item.id}
              >
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--orb-surface-hover)]">
                  {item.icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-[var(--orb-foreground)]">{item.label}</span>
                    {item.status && item.id !== 'appearance' ? (
                      <span className="shrink-0 text-[10px] text-[var(--orb-muted)]">{item.status}</span>
                    ) : null}
                  </span>
                  <span className="mt-0.5 block text-xs leading-5 text-[var(--orb-muted)]">{item.description}</span>
                  {item.id === 'privacy' ? (
                    <span className="mt-2 inline-block text-[10px] font-medium text-emerald-200/80">Open — read above</span>
                  ) : (
                    <span className="mt-2 inline-flex items-center gap-1 text-[10px] font-medium text-cyan-200/80">
                      <Settings className="h-3 w-3" aria-hidden />
                      Open
                    </span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </OrbStandalonePanelShell>
  )
}
