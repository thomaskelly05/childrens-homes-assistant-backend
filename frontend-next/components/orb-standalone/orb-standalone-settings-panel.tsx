'use client'

import type { ReactNode } from 'react'
import { Accessibility, Brain, Lock, Map, Mic, Settings, Shield } from 'lucide-react'

import { OrbStandalonePanelShell } from '@/components/orb-standalone/orb-standalone-panel-shell'

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
  onOpenIntelligenceMap
}: {
  open: boolean
  onClose: () => void
  onOpenMemory?: () => void
  onOpenAccessibility?: () => void
  onOpenPermissions?: () => void
  onOpenVoiceSettings?: () => void
  onOpenIntelligenceMap?: () => void
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
      description: 'Wake phrase, replies and test voice',
      status: 'Browser',
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
        <div className="rounded-xl bg-emerald-500/[0.06] px-3 py-2.5 ring-1 ring-emerald-400/12" data-orb-settings-privacy>
          <p className="flex items-center gap-2 text-[11px] font-medium text-emerald-100/90">
            <Shield className="h-3.5 w-3.5 shrink-0" aria-hidden />
            Privacy
          </p>
          <p className="mt-1 text-[11px] leading-5 text-slate-500">
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
                  if (item.id !== 'privacy') {
                    item.onClick()
                    onClose()
                  }
                }}
                className="flex w-full items-start gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-left transition hover:border-cyan-300/25 hover:bg-cyan-300/[0.04] focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300/40"
                data-orb-settings-card={item.id}
              >
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.04]">
                  {item.icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-slate-100">{item.label}</span>
                    {item.status ? (
                      <span className="shrink-0 text-[10px] text-slate-500">{item.status}</span>
                    ) : null}
                  </span>
                  <span className="mt-0.5 block text-xs leading-5 text-slate-500">{item.description}</span>
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
