'use client'

import { useState, type ReactNode } from 'react'
import {
  Accessibility,
  Bell,
  Brain,
  Database,
  HelpCircle,
  Keyboard,
  Lock,
  Map,
  Mic,
  Settings,
  Shield,
  User
} from 'lucide-react'

import { OrbAppearanceControl } from '@/components/orb-standalone/orb-appearance-control'
import { OrbStandalonePanelShell } from '@/components/orb-standalone/orb-standalone-panel-shell'
import type { OrbAppearanceMode } from '@/lib/orb/orb-appearance'

type SettingsSectionId =
  | 'general'
  | 'appearance'
  | 'voice'
  | 'personalisation'
  | 'accessibility'
  | 'data'
  | 'notifications'
  | 'shortcuts'
  | 'about'

const SECTION_META: Array<{ id: SettingsSectionId; label: string; description: string }> = [
  { id: 'general', label: 'General', description: 'Language and default behaviour' },
  { id: 'appearance', label: 'Appearance', description: 'Light, dark or system theme' },
  { id: 'voice', label: 'Voice', description: 'Auto-speak, preferred voice, speed and pitch' },
  { id: 'personalisation', label: 'Memory / Personalisation', description: 'Profile and custom instructions for ORB' },
  { id: 'accessibility', label: 'Accessibility', description: 'Contrast, motion and text size' },
  { id: 'data', label: 'Data controls', description: 'Export or clear local workspace data' },
  { id: 'notifications', label: 'Notifications', description: 'Reminders and alerts' },
  { id: 'shortcuts', label: 'Keyboard shortcuts', description: 'Quick actions in ORB' },
  { id: 'about', label: 'About ORB', description: 'Product boundary and version' }
]

export function OrbStandaloneSettingsPanel({
  open,
  onClose,
  onOpenMemory,
  onOpenAccessibility,
  onOpenPermissions,
  onOpenVoiceSettings,
  onOpenIntelligenceMap,
  onOpenProfile,
  onOpenHelp,
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
  onOpenProfile?: () => void
  onOpenHelp?: () => void
  appearanceMode?: OrbAppearanceMode
  onAppearanceChange?: (mode: OrbAppearanceMode) => void
}) {
  const [activeSection, setActiveSection] = useState<SettingsSectionId>('general')

  return (
    <OrbStandalonePanelShell
      open={open}
      title="Settings"
      subtitle="Standalone ORB"
      onClose={onClose}
      ariaLabel="ORB settings"
      panelId="settings"
      footer="Standalone ORB does not access IndiCare OS records."
    >
      <div className="flex min-h-0 flex-1 flex-col md:flex-row" data-orb-settings-panel>
        <nav className="shrink-0 border-b border-[var(--orb-line)] p-2 md:w-44 md:border-b-0 md:border-r" data-orb-settings-nav>
          {SECTION_META.map((section) => (
            <button
              key={section.id}
              type="button"
              onClick={() => setActiveSection(section.id)}
              className={`mb-0.5 flex w-full flex-col rounded-lg px-3 py-2 text-left text-xs transition ${
                activeSection === section.id
                  ? 'bg-[#EAF6FF] font-semibold text-[#0369A1]'
                  : 'text-[var(--orb-muted)] hover:bg-[var(--orb-surface-hover)] hover:text-[var(--orb-foreground)]'
              }`}
              data-orb-settings-section={section.id}
            >
              <span>{section.label}</span>
            </button>
          ))}
        </nav>

        <div className="flex-1 overflow-y-auto p-4">
          {activeSection === 'general' ? (
            <SettingsBlock title="General" description="Default ORB behaviour on this device.">
              <RowButton icon={<Settings className="h-4 w-4" />} label="Memory" hint="Workspace counts and export" onClick={() => { onOpenMemory?.(); onClose() }} />
              <RowButton icon={<Map className="h-4 w-4" />} label="Intelligence map" hint="Capability overview" onClick={() => { onOpenIntelligenceMap?.(); onClose() }} />
            </SettingsBlock>
          ) : null}

          {activeSection === 'appearance' ? (
            <SettingsBlock title="Appearance" description="Choose how ORB looks on this device.">
              <OrbAppearanceControl value={appearanceMode} onChange={(mode) => onAppearanceChange?.(mode)} />
            </SettingsBlock>
          ) : null}

          {activeSection === 'voice' ? (
            <SettingsBlock title="Voice" description="Speech output — no microphone required for auto-speak." dataAttr="voice">
              <RowButton icon={<Mic className="h-4 w-4" />} label="Voice settings" hint="Auto-speak, British female voice, test" onClick={() => { onOpenVoiceSettings?.(); onClose() }} />
            </SettingsBlock>
          ) : null}

          {activeSection === 'personalisation' ? (
            <SettingsBlock
              title="Memory / Personalisation"
              description="How ORB adapts to your role, tone and custom instructions."
              dataAttr="personalisation"
            >
              <RowButton
                icon={<User className="h-4 w-4" />}
                label="Manage profile"
                hint="Name, role, home, reasoning depth, voice preference"
                onClick={() => {
                  onOpenProfile?.()
                  onClose()
                }}
              />
              <p className="rounded-lg border border-[var(--orb-line)] bg-[var(--orb-surface)] px-3 py-2 text-[11px] leading-5 text-[var(--orb-muted)]">
                Custom instructions for ORB and role context are saved in your profile. ORB uses them when you send a
                message — they do not access live OS records.
              </p>
            </SettingsBlock>
          ) : null}

          {activeSection === 'accessibility' ? (
            <SettingsBlock title="Accessibility" description="Reading comfort and sensory preferences.">
              <RowButton icon={<Accessibility className="h-4 w-4" />} label="Accessibility" hint="Reduced motion, contrast, large text" onClick={() => { onOpenAccessibility?.(); onClose() }} />
            </SettingsBlock>
          ) : null}

          {activeSection === 'data' ? (
            <SettingsBlock title="Data controls" description="Your data stays on this device unless you export it.">
              <RowButton icon={<Database className="h-4 w-4" />} label="Export local data" hint="Via Memory panel" onClick={() => { onOpenMemory?.(); onClose() }} />
              <RowButton icon={<Brain className="h-4 w-4" />} label="Clear local memory" hint="Chats, profiles, projects" onClick={() => { onOpenMemory?.(); onClose() }} />
              <RowButton icon={<Lock className="h-4 w-4" />} label="Permissions" hint="Microphone, camera, uploads" onClick={() => { onOpenPermissions?.(); onClose() }} />
            </SettingsBlock>
          ) : null}

          {activeSection === 'notifications' ? (
            <SettingsBlock title="Notifications" description="Coming soon on standalone ORB.">
              <ComingSoonRow icon={<Bell className="h-4 w-4" />} label="Safeguarding reminders" />
              <ComingSoonRow icon={<Bell className="h-4 w-4" />} label="Supervision prep prompts" />
            </SettingsBlock>
          ) : null}

          {activeSection === 'shortcuts' ? (
            <SettingsBlock title="Keyboard shortcuts" description="Quick actions while chatting.">
              <ShortcutRow keys="Enter" action="Send message" />
              <ShortcutRow keys="Shift + Enter" action="New line in composer" />
              <ShortcutRow keys="Esc" action="Close panel / cancel edit" />
            </SettingsBlock>
          ) : null}

          {activeSection === 'about' ? (
            <SettingsBlock title="About ORB" description="Standalone Care Companion">
              <div className="rounded-xl border border-[var(--orb-line)] bg-[var(--orb-surface)] px-3 py-2.5" data-orb-settings-privacy>
                <p className="flex items-center gap-2 text-[11px] font-medium text-[var(--orb-foreground)]">
                  <Shield className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  Privacy boundary
                </p>
                <p className="mt-1 text-[11px] leading-5 text-[var(--orb-muted)]">
                  Standalone ORB does not call IndiCare OS APIs or read child, staff or home records.
                </p>
              </div>
              <RowButton icon={<HelpCircle className="h-4 w-4" />} label="Help" hint="Using ORB guide" onClick={() => { onOpenHelp?.(); onClose() }} />
            </SettingsBlock>
          ) : null}
        </div>
      </div>
    </OrbStandalonePanelShell>
  )
}

function SettingsBlock({
  title,
  description,
  children,
  dataAttr
}: {
  title: string
  description: string
  children: ReactNode
  dataAttr?: string
}) {
  return (
    <section data-orb-settings-block={dataAttr}>
      <h3 className="text-sm font-semibold text-[var(--orb-foreground)]">{title}</h3>
      <p className="mt-0.5 text-xs text-[var(--orb-muted)]">{description}</p>
      <div className="mt-3 space-y-2">{children}</div>
    </section>
  )
}

function RowButton({
  icon,
  label,
  hint,
  onClick
}: {
  icon: ReactNode
  label: string
  hint: string
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className="orb-panel-row flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left disabled:opacity-60"
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--orb-surface-hover)] text-[#0369A1]">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-[var(--orb-foreground)]">{label}</span>
        <span className="block text-xs text-[var(--orb-muted)]">{hint}</span>
      </span>
    </button>
  )
}

function ComingSoonRow({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-[var(--orb-line)] px-4 py-3 opacity-70">
      <span className="flex items-center gap-2 text-sm text-[var(--orb-muted)]">
        {icon}
        {label}
      </span>
      <span className="text-[10px] text-[var(--orb-muted)]">Coming soon</span>
    </div>
  )
}

function ShortcutRow({ keys, action }: { keys: string; action: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-[var(--orb-line)] px-4 py-2.5 text-xs">
      <span className="text-[var(--orb-foreground)]">{action}</span>
      <kbd className="rounded-md border border-[#CBD5E1] bg-[#F1F5F9] px-2 py-0.5 font-mono text-[10px] text-[#0F172A]">{keys}</kbd>
    </div>
  )
}
