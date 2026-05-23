'use client'

import type { ReactNode } from 'react'
import { Accessibility, Brain, Lock, Settings, Shield } from 'lucide-react'

import { OrbStandalonePanelShell } from '@/components/orb-standalone/orb-standalone-panel-shell'

type SettingsItem = {
  id: string
  label: string
  description: string
  icon: ReactNode
  onClick: () => void
}

export function OrbStandaloneSettingsPanel({
  open,
  onClose,
  onOpenMemory,
  onOpenAccessibility,
  onOpenPermissions,
  onOpenVoiceSettings
}: {
  open: boolean
  onClose: () => void
  onOpenMemory?: () => void
  onOpenAccessibility?: () => void
  onOpenPermissions?: () => void
  onOpenVoiceSettings?: () => void
}) {
  const items: SettingsItem[] = [
    {
      id: 'memory',
      label: 'Memory & preferences',
      description: 'Local workspace — no OS records',
      icon: <Brain className="h-4 w-4 text-violet-300" aria-hidden />,
      onClick: () => onOpenMemory?.()
    },
    {
      id: 'accessibility',
      label: 'Accessibility',
      description: 'Reading, contrast and sensory options',
      icon: <Accessibility className="h-4 w-4 text-cyan-300" aria-hidden />,
      onClick: () => onOpenAccessibility?.()
    },
    {
      id: 'permissions',
      label: 'Permissions',
      description: 'Microphone, camera and upload readiness',
      icon: <Lock className="h-4 w-4 text-slate-400" aria-hidden />,
      onClick: () => onOpenPermissions?.()
    },
    {
      id: 'voice',
      label: 'Voice settings',
      description: 'Wake phrase, replies and test voice',
      icon: <Settings className="h-4 w-4 text-slate-400" aria-hidden />,
      onClick: () => onOpenVoiceSettings?.()
    }
  ]

  return (
    <OrbStandalonePanelShell
      open={open}
      title="Settings"
      subtitle="Standalone ORB — privacy and comfort"
      onClose={onClose}
      ariaLabel="ORB settings"
    >
      <div className="space-y-4 p-4" data-orb-settings-panel>
        <div className="rounded-xl bg-emerald-500/[0.06] px-3 py-2.5 ring-1 ring-emerald-400/12">
          <p className="flex items-center gap-2 text-[11px] font-medium text-emerald-100/90">
            <Shield className="h-3.5 w-3.5 shrink-0" aria-hidden />
            No OS records accessed
          </p>
          <p className="mt-1 text-[11px] leading-5 text-slate-500">
            Standalone ORB does not call IndiCare OS APIs or read child, staff or home records.
          </p>
        </div>

        <ul className="grid gap-2">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => {
                  item.onClick()
                  onClose()
                }}
                className="flex w-full items-start gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-left transition hover:border-cyan-300/25 hover:bg-cyan-300/[0.04]"
              >
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.04]">
                  {item.icon}
                </span>
                <span>
                  <span className="block text-sm font-medium text-slate-100">{item.label}</span>
                  <span className="mt-0.5 block text-xs text-slate-500">{item.description}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </OrbStandalonePanelShell>
  )
}
