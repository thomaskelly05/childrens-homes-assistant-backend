'use client'

import { useEffect, useState, type ReactNode } from 'react'
import {
  Accessibility,
  Bell,
  ChevronLeft,
  Database,
  Fingerprint,
  HelpCircle,
  Keyboard,
  Lock,
  Map,
  Mic,
  Moon,
  Settings,
  Shield,
  Sun,
  Trash2,
  Type,
  User
} from 'lucide-react'

import { useOrbResponsiveMode } from '@/components/orb-standalone/use-orb-responsive-mode'
import { OrbAppearanceControl } from '@/components/orb-standalone/orb-appearance-control'
import { OrbBillingSettingsSection } from '@/components/orb-standalone/orb-billing-settings-section'
import { orbOverlayDrawerShellProps } from '@/components/orb-standalone/orb-app-modal'
import { OrbStandalonePanelShell } from '@/components/orb-standalone/orb-standalone-panel-shell'
import type { OrbAppearanceMode } from '@/lib/orb/orb-appearance'
import { isOrbDeveloperMode } from '@/lib/orb/orb-developer-mode'
import {
  deleteOrbPasskey,
  fetchOrbPasskeys,
  orbPasskeysSupported,
  registerOrbPasskey,
  type OrbPasskeyListResponse
} from '@/lib/orb/orb-passkey-client'
import {
  defaultOrbStandaloneChatSettings,
  loadOrbStandaloneChatSettings,
  saveOrbStandaloneChatSettings,
  type OrbStandaloneChatSettings
} from '@/lib/orb/orb-standalone-settings'
import {
  defaultOrbStandalonePersonalisation,
  loadOrbStandalonePersonalisation,
  saveOrbStandalonePersonalisation,
  type OrbStandalonePersonalisation
} from '@/lib/orb/orb-standalone-personalisation'
import type { StandaloneOrbAccessibilityPreferences } from '@/lib/orb/standalone-accessibility'

type SettingsSectionId =
  | 'appearance'
  | 'voice'
  | 'recording'
  | 'writing'
  | 'safety_privacy'
  | 'account_billing'
  | 'about'

export type OrbSettingsSectionId = SettingsSectionId

const SECTION_META: Array<{ id: SettingsSectionId; label: string }> = [
  { id: 'appearance', label: 'Appearance' },
  { id: 'voice', label: 'Voice' },
  { id: 'recording', label: 'Recording Preferences' },
  { id: 'writing', label: 'Writing Preferences' },
  { id: 'safety_privacy', label: 'Safety & Privacy' },
  { id: 'account_billing', label: 'Account & Billing' },
  { id: 'about', label: 'About ORB' }
]

type PasskeyItem = NonNullable<OrbPasskeyListResponse['items']>[number]

export function OrbStandaloneSettingsPanel({
  open,
  onClose,
  initialSection = 'appearance',
  appearanceMode = 'system',
  onAppearanceChange,
  a11yPrefs,
  onA11yChange,
  voiceInputEnabled,
  onVoiceInputChange,
  voiceRepliesEnabled,
  onVoiceRepliesChange,
  onOpenVoiceSettings,
  onOpenOrbVoice,
  onOpenProfile,
  onOpenHelp,
  onExportWorkspace,
  onClearMemory,
  onClearProfiles,
  onClearProjects,
  residentialSurface = false,
  userName,
  userEmail,
  avatarUrl
}: {
  open: boolean
  onClose: () => void
  initialSection?: OrbSettingsSectionId
  residentialSurface?: boolean
  appearanceMode?: OrbAppearanceMode
  onAppearanceChange?: (mode: OrbAppearanceMode) => void
  a11yPrefs?: StandaloneOrbAccessibilityPreferences
  onA11yChange?: (patch: Partial<StandaloneOrbAccessibilityPreferences>) => void
  voiceInputEnabled?: boolean
  onVoiceInputChange?: (enabled: boolean) => void
  voiceRepliesEnabled?: boolean
  onVoiceRepliesChange?: (enabled: boolean) => void
  onOpenVoiceSettings?: () => void
  onOpenOrbVoice?: () => void
  onOpenProfile?: () => void
  onOpenHelp?: () => void
  onExportWorkspace?: () => void
  onClearMemory?: () => void
  onClearProfiles?: () => void
  onClearProjects?: () => void
  userName?: string | null
  userEmail?: string | null
  avatarUrl?: string | null
}) {
  const { isMobile } = useOrbResponsiveMode()
  const [activeSection, setActiveSection] = useState<SettingsSectionId>('appearance')
  const [mobileSectionOpen, setMobileSectionOpen] = useState<SettingsSectionId | null>(null)
  const [personalisation, setPersonalisation] = useState<OrbStandalonePersonalisation>(
    defaultOrbStandalonePersonalisation
  )
  const [chatSettings, setChatSettings] = useState<OrbStandaloneChatSettings>(defaultOrbStandaloneChatSettings)
  const [passkeysSupported, setPasskeysSupported] = useState(false)
  const [passkeys, setPasskeys] = useState<PasskeyItem[]>([])
  const [passkeyStatus, setPasskeyStatus] = useState<string | null>(null)
  const [passkeyBusy, setPasskeyBusy] = useState(false)
  const developerMode = isOrbDeveloperMode()

  useEffect(() => {
    if (!open) {
      setMobileSectionOpen(null)
      return
    }
    setActiveSection(initialSection)
    setMobileSectionOpen(isMobile ? initialSection : null)
    setChatSettings(loadOrbStandaloneChatSettings())
    setPersonalisation(loadOrbStandalonePersonalisation())
    setPasskeysSupported(orbPasskeysSupported())
  }, [open, initialSection, isMobile])

  useEffect(() => {
    if (!open || activeSection !== 'safety_privacy') return
    void import('@/lib/auth/passkey-status-cache').then(({ allowPasskeyStatusFetch }) => {
      allowPasskeyStatusFetch('settings')
    })
    void refreshPasskeys()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, activeSection])

  async function refreshPasskeys() {
    try {
      const response = await fetchOrbPasskeys()
      setPasskeys(response.items ?? [])
      setPasskeyStatus(null)
    } catch (caught) {
      setPasskeys([])
      setPasskeyStatus(caught instanceof Error ? caught.message : 'Could not load passkeys')
    }
  }

  async function handleAddPasskey() {
    setPasskeyBusy(true)
    setPasskeyStatus(null)
    try {
      await registerOrbPasskey('ORB passkey')
      setPasskeyStatus('Face ID / Touch ID is now enabled for this account.')
      await refreshPasskeys()
    } catch (caught) {
      setPasskeyStatus(caught instanceof Error ? caught.message : 'Passkey setup was cancelled or failed.')
    } finally {
      setPasskeyBusy(false)
    }
  }

  async function handleDeletePasskey(passkeyId: number) {
    setPasskeyBusy(true)
    setPasskeyStatus(null)
    try {
      await deleteOrbPasskey(passkeyId)
      setPasskeyStatus('Passkey removed.')
      await refreshPasskeys()
    } catch (caught) {
      setPasskeyStatus(caught instanceof Error ? caught.message : 'Could not remove passkey.')
    } finally {
      setPasskeyBusy(false)
    }
  }

  function updateChat(patch: Partial<OrbStandaloneChatSettings>) {
    setChatSettings((current) => {
      const next = { ...current, ...patch }
      saveOrbStandaloneChatSettings(next)
      return next
    })
  }

  function updatePersonalisation(patch: Partial<OrbStandalonePersonalisation>) {
    setPersonalisation((current) => {
      const next = { ...current, ...patch }
      saveOrbStandalonePersonalisation(next)
      return next
    })
  }

  const textSize = a11yPrefs?.largeText ? 'large' : 'comfortable'
  const effectiveAppearance = appearanceMode ?? 'system'
  const showMobileList = isMobile && mobileSectionOpen === null
  const showMobileDetail = isMobile && mobileSectionOpen !== null
  const activeSectionLabel = SECTION_META.find((section) => section.id === activeSection)?.label ?? 'Settings'

  return (
    <OrbStandalonePanelShell
      open={open}
      title="Settings"
      subtitle="ORB Residential"
      onClose={onClose}
      ariaLabel="ORB settings"
      panelId="settings"
      footer={
        isMobile
          ? undefined
          : 'ORB Residential does not access IndiCare OS records. It uses your profile, conversation, uploaded documents and IndiCare residential intelligence.'
      }
      {...(residentialSurface
        ? { ...orbOverlayDrawerShellProps('workstation'), mobileMode: 'full' as const }
        : { layout: 'center' as const, wide: true, mobileMode: 'full' as const })}
    >
      <div
        className="orb-studio-shell flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row"
        data-orb-settings-panel
        data-orb-settings-drawer
        data-orb-settings-layout="premium-cards"
        data-orb-settings-mobile-layout={isMobile ? 'stack' : 'desktop'}
        data-orb-studio-shell="settings"
      >
        <nav
          className={`shrink-0 border-b border-[var(--orb-line)] p-2 md:w-44 md:border-b-0 md:border-r ${
            showMobileList ? 'flex flex-col gap-1' : 'hidden md:block'
          }`}
          data-orb-settings-nav
          data-orb-settings-nav-mobile={showMobileList ? 'true' : undefined}
        >
          {SECTION_META.map((section) => (
            <button
              key={section.id}
              type="button"
              onClick={() => {
                setActiveSection(section.id)
                if (isMobile) setMobileSectionOpen(section.id)
              }}
              className={`orb-settings-nav-item mb-0.5 flex w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium transition md:px-3 md:py-2 md:text-xs ${
                activeSection === section.id
                  ? 'orb-settings-nav-item--active font-semibold'
                  : 'text-[var(--orb-muted)] hover:bg-[var(--orb-surface-hover)] hover:text-[var(--orb-foreground)]'
              }`}
              data-orb-settings-section={section.id}
              data-orb-settings-nav-active={activeSection === section.id ? 'true' : 'false'}
            >
              {section.label}
            </button>
          ))}
        </nav>

        <div
          className={`overflow-x-hidden pb-[max(1rem,env(safe-area-inset-bottom))] ${
            showMobileDetail ? 'flex-none p-3' : 'flex-1 overflow-y-auto p-4'
          } ${showMobileList ? 'hidden' : ''}`}
          data-orb-settings-scroll
          data-orb-settings-mobile-detail={showMobileDetail ? 'true' : undefined}
        >
          {showMobileDetail ? (
            <button
              type="button"
              onClick={() => setMobileSectionOpen(null)}
              className="mb-3 inline-flex items-center gap-1 rounded-lg px-1 py-1 text-sm font-medium text-[var(--orb-muted)] transition hover:text-[var(--orb-foreground)]"
              data-orb-settings-mobile-back
            >
              <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden />
              Back to settings
            </button>
          ) : null}
          {showMobileDetail ? (
            <h3
              className="mb-1 text-sm font-semibold text-[var(--orb-foreground)]"
              data-orb-settings-section-heading
            >
              {activeSectionLabel}
            </h3>
          ) : null}
          {showMobileDetail && activeSection === 'appearance' ? (
            <p className="mb-3 text-xs text-[var(--orb-muted)]" data-orb-settings-section-description>
              Theme, text size and motion
            </p>
          ) : null}
          {activeSection === 'appearance' ? (
            <SettingsBlock
              title="Appearance"
              description="Theme, text size and motion on this device."
              suppressHeader={showMobileDetail}
            >
              <OrbAppearanceControl
                value={effectiveAppearance}
                onChange={(mode) => onAppearanceChange?.(mode)}
              />
              {!residentialSurface ? (
                <p className="text-[11px] leading-5 text-[var(--orb-muted)]">
                  System follows your device. You can override it here.
                </p>
              ) : null}
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
              <ComingSoonRow
                icon={<Bell className="h-4 w-4" />}
                label="Practice reminders"
                hint="Optional prompts to support safer recording and escalation awareness."
              />
            </SettingsBlock>
          ) : null}

          {activeSection === 'writing' ? (
            <SettingsBlock
              title="Writing Preferences"
              description="Set the tone ORB uses when supporting professional recording."
              suppressHeader={showMobileDetail}
            >
              <label className="block rounded-xl border border-[var(--orb-line)] px-4 py-3" data-orb-settings-preferred-name>
                <span className="block text-sm font-medium text-[var(--orb-foreground)]">Preferred name</span>
                <span className="block text-xs text-[var(--orb-muted)]">How ORB greets you on the home screen</span>
                <input
                  type="text"
                  value={personalisation.preferredName}
                  onChange={(e) => updatePersonalisation({ preferredName: e.target.value })}
                  placeholder="e.g. Tom"
                  className="mt-2 w-full rounded-lg border border-[var(--orb-line)] bg-[var(--orb-surface)] px-3 py-2 text-sm text-[var(--orb-foreground)]"
                />
              </label>
              <fieldset className="rounded-xl border border-[var(--orb-line)] px-4 py-3" data-orb-settings-greeting-style>
                <legend className="text-sm font-medium text-[var(--orb-foreground)]">Greeting style</legend>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(['calm', 'direct', 'supportive'] as const).map((style) => (
                    <TogglePill
                      key={style}
                      active={personalisation.greetingStyle === style}
                      label={style.charAt(0).toUpperCase() + style.slice(1)}
                      onClick={() => updatePersonalisation({ greetingStyle: style })}
                    />
                  ))}
                </div>
              </fieldset>
              <fieldset className="rounded-xl border border-[var(--orb-line)] px-4 py-3" data-orb-settings-professional-tone>
                <legend className="text-sm font-medium text-[var(--orb-foreground)]">Professional tone</legend>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(
                    [
                      ['therapeutic', 'Therapeutic'],
                      ['compliance', 'Compliance'],
                      ['balanced', 'Balanced']
                    ] as const
                  ).map(([id, label]) => (
                    <TogglePill
                      key={id}
                      active={personalisation.professionalTone === id}
                      label={label}
                      onClick={() => updatePersonalisation({ professionalTone: id })}
                    />
                  ))}
                </div>
              </fieldset>
            </SettingsBlock>
          ) : null}

          {activeSection === 'voice' ? (
            <SettingsBlock
              title="Voice"
              description="Speech input and read-aloud preferences."
              suppressHeader={showMobileDetail}
            >
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
                hint="British voice, speed, modes and interruption"
                onClick={() => {
                  onOpenVoiceSettings?.()
                  onClose()
                }}
              />
              {onOpenOrbVoice ? (
                <RowButton
                  icon={<Mic className="h-4 w-4" />}
                  label="Open ORB Voice"
                  hint="Conversational voice room for residential childcare"
                  onClick={() => {
                    onOpenOrbVoice()
                    onClose()
                  }}
                />
              ) : null}
            </SettingsBlock>
          ) : null}

          {activeSection === 'recording' ? (
            <SettingsBlock
              title="Recording Preferences"
              description="Choose how ORB helps structure daily records, incidents, handovers and reflective notes."
              suppressHeader={showMobileDetail}
            >
              <ToggleRow
                label="Temporary chat by default"
                hint="New chats skip profile memory until you turn it off"
                checked={chatSettings.defaultTemporaryChat}
                onChange={(value) => updateChat({ defaultTemporaryChat: value })}
                dataAttr="default-temporary-chat"
              />
              {developerMode ? (
                <div data-orb-settings-developer-only>
                  <ToggleRow
                    label="Show cognition labels"
                    hint="Developer only — internal routing labels under answers"
                    checked={chatSettings.showCognitionLabels}
                    onChange={(value) => updateChat({ showCognitionLabels: value })}
                    dataAttr="show-cognition-labels"
                  />
                </div>
              ) : null}
              <p className="text-[11px] leading-5 text-[var(--orb-muted)]">
                Use Dictate, Templates and Documents from the sidebar for structured recording, handovers and inspection
                prep.
              </p>
            </SettingsBlock>
          ) : null}

          {activeSection === 'safety_privacy' ? (
            <SettingsBlock
              title="Safety & Privacy"
              description="Understand what ORB can and cannot process, and how to use anonymised or minimal information safely."
              suppressHeader={showMobileDetail}
            >
              <div className="rounded-xl border border-[var(--orb-line)] bg-[var(--orb-surface)] px-4 py-3">
                <p className="flex items-center gap-2 text-sm font-semibold text-[var(--orb-foreground)]">
                  <Fingerprint className="h-4 w-4 text-[#0284C7]" aria-hidden />
                  Face ID / Touch ID
                </p>
                <p className="mt-1 text-xs leading-5 text-[var(--orb-muted)]">
                  Add a passkey so this device can sign in to ORB more quickly. Your biometric stays on your device;
                  ORB stores the passkey credential needed to recognise you securely.
                </p>
                <button
                  type="button"
                  onClick={handleAddPasskey}
                  disabled={!passkeysSupported || passkeyBusy}
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0284C7] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#0369A1] disabled:cursor-not-allowed disabled:opacity-50"
                  data-orb-passkey-register
                >
                  <Fingerprint className="h-4 w-4" aria-hidden />
                  {passkeyBusy ? 'Working…' : passkeysSupported ? 'Add Face ID / Touch ID' : 'Passkeys unavailable'}
                </button>
                {passkeyStatus ? (
                  <p className="mt-2 text-xs leading-5 text-[var(--orb-muted)]" data-orb-passkey-status>
                    {passkeyStatus}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2" data-orb-passkey-list>
                <p className="text-xs font-semibold text-[var(--orb-foreground)]">Saved passkeys</p>
                {passkeys.length ? (
                  passkeys.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-[var(--orb-line)] px-4 py-3"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-[var(--orb-foreground)]">
                          {item.nickname || 'ORB passkey'}
                        </span>
                        <span className="block text-xs text-[var(--orb-muted)]">
                          {item.last_used_at ? `Last used ${new Date(item.last_used_at).toLocaleDateString()}` : 'Not used yet'}
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeletePasskey(item.id)}
                        disabled={passkeyBusy}
                        className="rounded-full border border-[var(--orb-line)] p-2 text-[var(--orb-muted)] transition hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                        aria-label="Remove passkey"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden />
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="rounded-xl border border-dashed border-[var(--orb-line)] px-4 py-3 text-xs text-[var(--orb-muted)]">
                    No passkeys saved yet.
                  </p>
                )}
              </div>
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
              <div className="rounded-xl border border-[var(--orb-line)] bg-[var(--orb-surface)] px-3 py-2.5" data-orb-settings-privacy-link>
                <a
                  href="/orb/privacy"
                  className="text-xs font-semibold text-[var(--orb-primary,#1677ff)] hover:underline"
                  data-orb-settings-privacy-page-link
                >
                  ORB Privacy &amp; Data Handling
                </a>
                <p className="mt-1 text-[11px] leading-5 text-[var(--orb-muted)]">
                  Green / Amber / Red guidance, retention status and privacy requests.
                </p>
              </div>
              <div className="rounded-xl border border-[var(--orb-line)] bg-[var(--orb-surface)] px-3 py-2.5" data-orb-settings-privacy>
                <p className="flex items-center gap-2 text-[11px] font-medium text-[var(--orb-foreground)]">
                  <Shield className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  How ORB protects your data
                </p>
                <p className="mt-1 text-[11px] leading-5 text-[var(--orb-muted)]" data-orb-settings-data-safety>
                  ORB Residential does not access IndiCare OS records. It uses your profile, conversation, uploaded documents and IndiCare residential intelligence. ORB
                  only uses what you type, upload, save or submit as feedback here. Temporary chat skips saved profile
                  context for that chat. AI providers process the text you send — not live OS records. Use initials
                  where you can. Feedback improves ORB through human review; it does not make automatic care
                  decisions. For permissioned OS context, use IndiCare OS ORB at /assistant/orb.
                </p>
              </div>
            </SettingsBlock>
          ) : null}

          {activeSection === 'account_billing' ? (
            <SettingsBlock
              title="Account & Billing"
              description="Plan, subscription, usage and billing management."
              suppressHeader={showMobileDetail}
            >
              <OrbBillingSettingsSection
                userName={userName}
                userEmail={userEmail}
                avatarUrl={avatarUrl}
                onOpenProfile={() => {
                  onOpenProfile?.()
                  onClose()
                }}
              />
            </SettingsBlock>
          ) : null}

          {activeSection === 'about' ? (
            <SettingsBlock
              title="About ORB"
              description="ORB Residential — ethical intelligence for children’s homes."
              suppressHeader={showMobileDetail}
            >
              <div className="flex items-center gap-2 text-xs text-[var(--orb-muted)]">
                <Sun className="h-4 w-4" aria-hidden />
                <Moon className="h-4 w-4" aria-hidden />
                <span>IndiCare ORB · standalone route /orb</span>
              </div>
              <ShortcutRow keys="Enter" action="Send message" />
              <ShortcutRow keys="Shift + Enter" action="New line in composer" />
              <ShortcutRow keys="Esc" action="Close panel or cancel edit" />
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
  children,
  suppressHeader = false
}: {
  title: string
  description: string
  children: ReactNode
  suppressHeader?: boolean
}) {
  return (
    <section>
      {!suppressHeader ? (
        <>
          <h3 className="text-sm font-semibold text-[var(--orb-foreground)]">{title}</h3>
          <p className="mt-0.5 text-xs text-[var(--orb-muted)]">{description}</p>
        </>
      ) : null}
      <div className={`space-y-3 ${suppressHeader ? 'space-y-2.5' : 'mt-3'}`}>{children}</div>
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
      className={`orb-settings-row flex items-center justify-between gap-3 rounded-xl border border-[var(--orb-line)]/60 px-3.5 py-2.5 ${disabled ? 'opacity-60' : ''}`}
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
      className="orb-panel-row orb-settings-row flex w-full items-center gap-3 rounded-xl border border-[var(--orb-line)]/60 px-3.5 py-2.5 text-left disabled:opacity-60"
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

function ComingSoonRow({ icon, label, hint }: { icon: ReactNode; label: string; hint?: string }) {
  return (
    <div
      className="rounded-xl border border-[var(--orb-line)] px-3 py-2 opacity-80 md:px-4 md:py-3"
      data-orb-settings-coming-soon
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-sm text-[var(--orb-muted)]">
          {icon}
          {label}
        </span>
        <span className="shrink-0 text-[10px] text-[var(--orb-muted)]">Coming soon</span>
      </div>
      {hint ? <p className="mt-1 hidden text-[11px] leading-5 text-[var(--orb-muted)] md:block">{hint}</p> : null}
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
