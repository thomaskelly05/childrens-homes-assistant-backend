'use client'

import { useEffect, useState, type ReactNode } from 'react'
import {
  Accessibility,
  Bell,
  Database,
  HelpCircle,
  Keyboard,
  Lock,
  Map,
  Mic,
  Moon,
  Settings,
  Shield,
  Sun,
  Type,
  User
} from 'lucide-react'

import { OrbAppearanceControl } from '@/components/orb-standalone/orb-appearance-control'
import { OrbStandalonePanelShell } from '@/components/orb-standalone/orb-standalone-panel-shell'
import type { OrbAppearanceMode } from '@/lib/orb/orb-appearance'
import {
  defaultOrbStandaloneChatSettings,
  loadOrbStandaloneChatSettings,
  saveOrbStandaloneChatSettings,
  type OrbStandaloneChatSettings
} from '@/lib/orb/orb-standalone-settings'
import type { StandaloneOrbAccessibilityPreferences } from '@/lib/orb/standalone-accessibility'

type SettingsSectionId =
  | 'appearance'
  | 'voice'
  | 'chat'
  | 'privacy'
  | 'notifications'
  | 'shortcuts'
  | 'about'

const SECTION_META: Array<{ id: SettingsSectionId; label: string }> = [
  { id: 'appearance', label: 'Appearance' },
  { id: 'voice', label: 'Voice' },
  { id: 'chat', label: 'Chat' },
  { id: 'privacy', label: 'Privacy & data' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'shortcuts', label: 'Shortcuts' },
  { id: 'about', label: 'About' }
]

export function OrbStandaloneSettingsPanel({
  open,
  onClose,
  appearanceMode = 'light',
  onAppearanceChange,
  a11yPrefs,
  onA11yChange,
  voiceInputEnabled,
  onVoiceInputChange,
  voiceRepliesEnabled,
  onVoiceRepliesChange,
  onOpenVoiceSettings,
  onOpenProfile,
  onOpenHelp,
  onExportWorkspace,
  onClearMemory,
  onClearProfiles,
  onClearProjects
}: {
  open: boolean
  onClose: () => void
  appearanceMode?: OrbAppearanceMode
  onAppearanceChange?: (mode: OrbAppearanceMode) => void
  a11yPrefs?: StandaloneOrbAccessibilityPreferences
  onA11yChange?: (patch: Partial<StandaloneOrbAccessibilityPreferences>) => void
  voiceInputEnabled?: boolean
  onVoiceInputChange?: (enabled: boolean) => void
  voiceRepliesEnabled?: boolean
  onVoiceRepliesChange?: (enabled: boolean) => void
  onOpenVoiceSettings?: () => void
  onOpenProfile?: () => void
  onOpenHelp?: () => void
  onExportWorkspace?: () => void
  onClearMemory?: () => void
  onClearProfiles?: () => void
  onClearProjects?: () => void
}) {
  const [activeSection, setActiveSection] = useState<SettingsSectionId>('appearance')
  const [chatSettings, setChatSettings] = useState<OrbStandaloneChatSettings>(defaultOrbStandaloneChatSettings)

  useEffect(() => {
    if (!open) return
    setChatSettings(loadOrbStandaloneChatSettings())
  }, [open])

  function updateChat(patch: Partial<OrbStandaloneChatSettings>) {
    setChatSettings((current) => {
      const next = { ...current, ...patch }
      saveOrbStandaloneChatSettings(next)
      return next
    })
  }

  const textSize = a11yPrefs?.largeText ? 'large' : 'comfortable'

  return (
    <OrbStandalonePanelShell
      open={open}
      title="Settings"
      subtitle="Standalone ORB"
      onClose={onClose}
      ariaLabel="ORB settings"
      panelId="settings"
      layout="center"
      wide
      footer="Standalone ORB does not access IndiCare OS child, home, staff, chronology or care records."
    >
      <div className="flex min-h-0 flex-1 flex-col md:flex-row" data-orb-settings-panel>
        <nav className="shrink-0 border-b border-[var(--orb-line)] p-2 md:w-44 md:border-b-0 md:border-r" data-orb-settings-nav>
          {SECTION_META.map((section) => (
            <button
              key={section.id}
              type="button"
              onClick={() => setActiveSection(section.id)}
              className={`mb-0.5 flex w-full rounded-lg px-3 py-2 text-left text-xs transition ${
                activeSection === section.id
                  ? 'bg-[#EAF6FF] font-semibold text-[#0369A1]'
                  : 'text-[var(--orb-muted)] hover:bg-[var(--orb-surface-hover)] hover:text-[var(--orb-foreground)]'
              }`}
              data-orb-settings-section={section.id}
            >
              {section.label}
            </button>
          ))}
        </nav>

        <div className="flex-1 overflow-y-auto p-4">
          {activeSection === 'appearance' ? (
            <SettingsBlock title="Appearance" description="How ORB looks on this device.">
              <OrbAppearanceControl value={appearanceMode} onChange={(mode) => onAppearanceChange?.(mode)} />
              <p className="text-[11px] leading-5 text-[var(--orb-muted)]">
                Dark theme is available; full dark polish is still improving.
              </p>
              <fieldset>
                <legend className="mb-2 flex items-center gap-2 text-xs font-medium text-[var(--orb-foreground)]">
                  <Type className="h-3.5 w-3.5" aria-hidden />
                  Text size
                </legend>
                <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Text size">
                  <TogglePill
                    active={textSize === 'comfortable'}
                    label="Comfortable"
                    onClick={() => onA11yChange?.({ largeText: false })}
                  />
                  <TogglePill
                    active={textSize === 'large'}
                    label="Large"
                    onClick={() => onA11yChange?.({ largeText: true })}
                  />
                </div>
              </fieldset>
              <ToggleRow
                label="Reduce motion"
                hint="Less animation while streaming and scrolling"
                checked={Boolean(a11yPrefs?.reducedMotion)}
                onChange={(value) => onA11yChange?.({ reducedMotion: value })}
                dataAttr="reduce-motion"
              />
            </SettingsBlock>
          ) : null}

          {activeSection === 'voice' ? (
            <SettingsBlock title="Voice" description="Speech input and read-aloud preferences.">
              <p className="text-[11px] leading-6 text-[var(--orb-muted)]" data-orb-settings-voice-help>
                ORB can read responses aloud using your device/browser voices. Voice quality depends on Safari,
                Chrome, macOS, iOS, Windows or Android. Choose the voice that feels most natural for you. Where
                possible, ORB will default to a British female voice.
              </p>
              <ToggleRow
                label="Enable voice input"
                hint="Push-to-talk from the composer mic button"
                checked={Boolean(voiceInputEnabled)}
                onChange={(value) => onVoiceInputChange?.(value)}
                disabled={!onVoiceInputChange}
                dataAttr="voice-input"
              />
              <ToggleRow
                label="Read aloud preference"
                hint="Auto-speak completed answers (per-message Speak always available when supported)"
                checked={Boolean(voiceRepliesEnabled)}
                onChange={(value) => onVoiceRepliesChange?.(value)}
                dataAttr="voice-replies"
              />
              <RowButton
                icon={<Mic className="h-4 w-4" />}
                label="Voice settings"
                hint="British voice, speed, pitch and test"
                onClick={() => {
                  onOpenVoiceSettings?.()
                  onClose()
                }}
              />
            </SettingsBlock>
          ) : null}

          {activeSection === 'chat' ? (
            <SettingsBlock title="Chat" description="Default behaviour for new conversations.">
              <ToggleRow
                label="Temporary chat by default"
                hint="New chats skip profile memory until you turn it off"
                checked={chatSettings.defaultTemporaryChat}
                onChange={(value) => updateChat({ defaultTemporaryChat: value })}
                dataAttr="default-temporary-chat"
              />
              <ToggleRow
                label="Show cognition labels"
                hint="Pills such as “Using · Safeguarding” under assistant answers"
                checked={chatSettings.showCognitionLabels}
                onChange={(value) => updateChat({ showCognitionLabels: value })}
                dataAttr="show-cognition-labels"
              />
              <RowButton
                icon={<User className="h-4 w-4" />}
                label="Manage profile"
                hint="Role, tone and custom instructions"
                onClick={() => {
                  onOpenProfile?.()
                  onClose()
                }}
              />
            </SettingsBlock>
          ) : null}

          {activeSection === 'privacy' ? (
            <SettingsBlock title="Privacy & local data" description="Your workspace stays on this device unless you export it.">
              <RowButton
                icon={<Database className="h-4 w-4" />}
                label="Export workspace JSON"
                hint="Download chats, projects and profiles"
                onClick={onExportWorkspace}
              />
              <RowButton
                icon={<Settings className="h-4 w-4" />}
                label="Clear local ORB memory"
                hint="All chats on this device"
                onClick={onClearMemory}
              />
              <RowButton icon={<User className="h-4 w-4" />} label="Clear profiles" hint="Workspace context profiles" onClick={onClearProfiles} />
              <RowButton
                icon={<Map className="h-4 w-4" />}
                label="Clear custom projects"
                hint="Chats move to General"
                onClick={onClearProjects}
              />
              <div className="rounded-xl border border-[var(--orb-line)] bg-[var(--orb-surface)] px-3 py-2.5" data-orb-settings-privacy>
                <p className="flex items-center gap-2 text-[11px] font-medium text-[var(--orb-foreground)]">
                  <Shield className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  How ORB protects your data
                </p>
                <p className="mt-1 text-[11px] leading-5 text-[var(--orb-muted)]" data-orb-settings-data-safety>
                  Standalone ORB does not access IndiCare OS child, home, staff, chronology or care records. ORB
                  only uses what you type, upload, save or submit as feedback here. Temporary chat skips saved profile
                  context for that chat. AI providers process the text you send — not live OS records. Use initials
                  where you can. Feedback improves ORB through human review; it does not make automatic care
                  decisions. For permissioned OS context, use IndiCare OS ORB at /assistant/orb.
                </p>
              </div>
            </SettingsBlock>
          ) : null}

          {activeSection === 'notifications' ? (
            <SettingsBlock title="Notifications" description="Coming soon on standalone ORB.">
              <ComingSoonRow icon={<Bell className="h-4 w-4" />} label="Safeguarding reminders" />
              <ComingSoonRow icon={<Bell className="h-4 w-4" />} label="Supervision prep prompts" />
            </SettingsBlock>
          ) : null}

          {activeSection === 'shortcuts' ? (
            <SettingsBlock title="Keyboard shortcuts" description="While chatting on /orb.">
              <ShortcutRow keys="Enter" action="Send message" />
              <ShortcutRow keys="Shift + Enter" action="New line in composer" />
              <ShortcutRow keys="Esc" action="Close panel or cancel edit" />
            </SettingsBlock>
          ) : null}

          {activeSection === 'about' ? (
            <SettingsBlock title="About ORB" description="Standalone Care Companion">
              <div className="flex items-center gap-2 text-xs text-[var(--orb-muted)]">
                <Sun className="h-4 w-4" aria-hidden />
                <Moon className="h-4 w-4" aria-hidden />
                <span>IndiCare ORB · standalone route /orb</span>
              </div>
              <RowButton
                icon={<HelpCircle className="h-4 w-4" />}
                label="Help"
                hint="Using ORB guide"
                onClick={() => {
                  onOpenHelp?.()
                  onClose()
                }}
              />
              <RowButton
                icon={<Accessibility className="h-4 w-4" />}
                label="Accessibility panel"
                hint="Dyslexia, contrast and sensory options"
                disabled
                hintOverride="Open from Tools → Accessibility (coming soon in Settings)"
              />
              <RowButton icon={<Lock className="h-4 w-4" />} label="Permissions" hint="Microphone and uploads" disabled />
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
  children
}: {
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <section>
      <h3 className="text-sm font-semibold text-[var(--orb-foreground)]">{title}</h3>
      <p className="mt-0.5 text-xs text-[var(--orb-muted)]">{description}</p>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  )
}

function TogglePill({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
        active
          ? 'border-[var(--orb-primary-cyan)] bg-[#00B8FF]/10 text-[var(--orb-foreground)]'
          : 'border-[var(--orb-line)] text-[var(--orb-muted)] hover:bg-[var(--orb-surface-hover)]'
      }`}
    >
      {label}
    </button>
  )
}

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
  disabled,
  dataAttr
}: {
  label: string
  hint: string
  checked: boolean
  onChange: (value: boolean) => void
  disabled?: boolean
  dataAttr?: string
}) {
  return (
    <label
      className={`flex items-center justify-between gap-3 rounded-xl border border-[var(--orb-line)] px-4 py-3 ${disabled ? 'opacity-60' : ''}`}
      data-orb-settings-toggle={dataAttr}
    >
      <span className="min-w-0">
        <span className="block text-sm font-medium text-[var(--orb-foreground)]">{label}</span>
        <span className="block text-xs text-[var(--orb-muted)]">{hint}</span>
      </span>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="h-5 w-5 shrink-0 accent-[#00B8FF]"
      />
    </label>
  )
}

function RowButton({
  icon,
  label,
  hint,
  onClick,
  disabled,
  hintOverride
}: {
  icon: ReactNode
  label: string
  hint: string
  onClick?: () => void
  disabled?: boolean
  hintOverride?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || !onClick}
      className="orb-panel-row flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left disabled:opacity-60"
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--orb-surface-hover)] text-[#0369A1]">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-[var(--orb-foreground)]">{label}</span>
        <span className="block text-xs text-[var(--orb-muted)]">{hintOverride || hint}</span>
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
