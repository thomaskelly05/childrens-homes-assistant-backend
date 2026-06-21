'use client'

import { useEffect, useState } from 'react'

import { useStandaloneOrbVoice } from '@/components/orb-standalone/use-standalone-orb-voice'
import { OrbStandalonePanelShell } from '@/components/orb-standalone/orb-standalone-panel-shell'
import { isOrbDeveloperMode } from '@/lib/orb/orb-developer-mode'
import {
  ORB_SPEECH_RATE_PRESETS,
  speechRatePresetFor,
  type OrbSpeechRatePreset
} from '@/lib/orb/orb-voice-presets'
import {
  getOrbVoiceProfile,
  listCuratedOrbVoiceProfiles,
  orbVoiceProfileLabel
} from '@/lib/orb/voice/orb-voice-profiles'
import {
  fetchOrbVoiceProviderStatus,
  type OrbVoiceProviderStatus
} from '@/lib/orb/voice/orb-voice-provider'
import {
  fetchOrbVoiceRealtimeStatus,
  type OrbVoiceRuntimeDiagnostics
} from '@/lib/orb/voice/orb-realtime-availability'
import type { OrbSpokenAnswerLength, OrbVoicePresetId } from '@/lib/orb/voice/orb-voice-types'
import { ORB_VOICE_BOUNDARY_COPY } from '@/lib/orb/voice/orb-voice-launch-mode'
import { ORB_VOICE_AUDIO_TRANSCRIPT_REVIEW_NOTE } from '@/lib/orb/voice/orb-voice-reflective-copy'
import { detectSpeechRecognitionSupported } from '@/lib/orb/voice/orb-voice-readiness'

const PACE_LABELS: Record<OrbSpeechRatePreset, string> = {
  slow: 'Slower',
  normal: 'Natural',
  fast: 'Quicker'
}

const LENGTH_LABELS: Record<OrbSpokenAnswerLength, string> = {
  short: 'Concise',
  balanced: 'Balanced',
  detailed: 'Detailed'
}

type VoiceSettingsCompat = ReturnType<typeof useStandaloneOrbVoice> & {
  setSpokenAnswerLength: (length: OrbSpokenAnswerLength) => void
  setAllowInterruption: (enabled: boolean) => void
  setPushToTalk: (enabled: boolean) => void
  setSaveTranscript: (enabled: boolean) => void
  setUseBrowserFallback: (enabled: boolean) => void
  setAutoSend: (enabled: boolean) => void
  setPrivacyMode: (enabled: boolean) => void
  setSensitiveSpokenReplies: (enabled: boolean) => void
  previewVoiceProfile: (profileId?: OrbVoicePresetId) => void | Promise<void>
}

export function OrbVoiceSettingsPanel({
  open,
  onClose,
  onOpenOrbVoice
}: {
  open: boolean
  onClose: () => void
  onOpenOrbVoice?: () => void
}) {
  const baseVoice = useStandaloneOrbVoice()
  const voice = {
    ...baseVoice,
    setSpokenAnswerLength: (spokenAnswerLength: OrbSpokenAnswerLength) =>
      baseVoice.updateSettings({ spokenAnswerLength }),
    setAllowInterruption: (allowInterruption: boolean) => baseVoice.updateSettings({ allowInterruption }),
    setPushToTalk: (pushToTalk: boolean) => baseVoice.updateSettings({ pushToTalk }),
    setSaveTranscript: (saveTranscript: boolean) => baseVoice.updateSettings({ saveTranscript }),
    setUseBrowserFallback: (useBrowserFallback: boolean) => baseVoice.updateSettings({ useBrowserFallback }),
    setAutoSend: (autoSend: boolean) => baseVoice.updateSettings({ autoSend }),
    setPrivacyMode: (privacyMode: boolean) => baseVoice.updateSettings({ privacyMode }),
    setSensitiveSpokenReplies: (sensitiveSpokenReplies: boolean) =>
      baseVoice.updateSettings({ sensitiveSpokenReplies }),
    previewVoiceProfile: (_profileId?: OrbVoicePresetId) => baseVoice.testSelectedVoice()
  } satisfies VoiceSettingsCompat

  const { settings, availableVoices, preferredVoiceName, voiceSelectionNote } = voice
  const activeRate = speechRatePresetFor(settings.speechRate)
  const developerMode = isOrbDeveloperMode()
  const curatedProfiles = listCuratedOrbVoiceProfiles()
  const selectedProfile = getOrbVoiceProfile(settings.voicePresetId)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [providerStatus, setProviderStatus] = useState<OrbVoiceProviderStatus | null>(null)
  const [runtimeStatus, setRuntimeStatus] = useState<OrbVoiceRuntimeDiagnostics | null>(null)

  useEffect(() => {
    if (!open) return
    void fetchOrbVoiceProviderStatus().then(setProviderStatus)
    void fetchOrbVoiceRealtimeStatus().then((status) => setRuntimeStatus(status.runtime ?? null))
  }, [open])

  return (
    <OrbStandalonePanelShell
      open={open}
      title="Voice"
      subtitle="Calm, professional ORB Voice preferences"
      onClose={onClose}
      ariaLabel="ORB voice settings"
      panelId="voice"
    >
      <div className="space-y-4 p-4" data-orb-voice-settings-panel>
        <p className="text-[11px] leading-5 text-[var(--orb-muted)]" data-orb-voice-settings-help>
          {selectedProfile.id === 'katherine'
            ? runtimeStatus?.katherineReady
              ? 'Katherine ready'
              : runtimeStatus?.ttsProviderForced === 'openai' ||
                  runtimeStatus?.forcedProvider === 'openai'
                ? 'Katherine unavailable — OpenAI fallback is active.'
                : 'Katherine unavailable — fallback voice active'
            : 'Choose how ORB sounds. ORB uses your device&apos;s best matching voice when premium voice is unavailable.'}
        </p>

        {onOpenOrbVoice ? (
          <button
            type="button"
            onClick={() => {
              onOpenOrbVoice()
              onClose()
            }}
            className="w-full rounded-xl border border-[#168bff]/40 bg-[#168bff]/10 px-4 py-3 text-left text-sm font-medium text-[var(--orb-foreground)] hover:bg-[#168bff]/15"
            data-orb-open-orb-voice
          >
            Open ORB Voice
          </button>
        ) : null}

        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-[var(--orb-muted)]">Voice profile</span>
          <select
            value={settings.voicePresetId}
            onChange={(e) => voice.setVoicePresetId(e.target.value as OrbVoicePresetId)}
            className="orb-profile-input w-full"
            data-orb-voice-profile-select
          >
            {curatedProfiles.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.label}
              </option>
            ))}
            {settings.voicePresetId &&
            !curatedProfiles.some((p) => p.id === settings.voicePresetId) ? (
              <option value={settings.voicePresetId}>{selectedProfile.label}</option>
            ) : null}
          </select>
          <p className="mt-1 text-[10px] text-[var(--orb-muted)]">{selectedProfile.description}</p>
        </label>

        <fieldset>
          <legend className="mb-2 text-xs font-medium text-[var(--orb-muted)]">Pace</legend>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Speech pace">
            {(Object.keys(ORB_SPEECH_RATE_PRESETS) as OrbSpeechRatePreset[]).map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => voice.setSpeechRate(ORB_SPEECH_RATE_PRESETS[preset])}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  activeRate === preset
                    ? 'border-[#0284C7] bg-[#E0F2FE] text-[#0369A1]'
                    : 'border-[var(--orb-line)] text-[var(--orb-muted)] hover:bg-[var(--orb-surface-hover)]'
                }`}
                data-orb-voice-pace={preset}
              >
                {PACE_LABELS[preset]}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-xs font-medium text-[var(--orb-muted)]">Reply length (spoken)</legend>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Spoken reply length">
            {(Object.keys(LENGTH_LABELS) as OrbSpokenAnswerLength[]).map((length) => (
              <button
                key={length}
                type="button"
                onClick={() => voice.setSpokenAnswerLength(length)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  settings.spokenAnswerLength === length
                    ? 'border-[#0284C7] bg-[#E0F2FE] text-[#0369A1]'
                    : 'border-[var(--orb-line)] text-[var(--orb-muted)] hover:bg-[var(--orb-surface-hover)]'
                }`}
                data-orb-voice-answer-length={length}
              >
                {LENGTH_LABELS[length]}
              </button>
            ))}
          </div>
        </fieldset>

        <label className="flex cursor-pointer items-start justify-between gap-3 rounded-xl border border-[var(--orb-line)] bg-[var(--orb-surface)] px-4 py-3">
          <span>
            <span className="block text-sm font-medium text-[var(--orb-foreground)]">Voice replies</span>
            <span className="mt-0.5 block text-xs text-[var(--orb-muted)]">
              Speak shorter summaries when safe. Full answer always stays on screen.
            </span>
          </span>
          <input
            type="checkbox"
            checked={settings.voiceReplies}
            onChange={(e) => voice.setVoiceReplies(e.target.checked)}
            data-orb-voice-auto-speak
          />
        </label>

        <label className="flex cursor-pointer items-start justify-between gap-3 rounded-xl border border-[var(--orb-line)] bg-[var(--orb-surface)] px-4 py-3">
          <span>
            <span className="block text-sm font-medium text-[var(--orb-foreground)]">Auto-send after speech</span>
            <span className="mt-0.5 block text-xs text-[var(--orb-muted)]">Send when transcription is ready.</span>
          </span>
          <input
            type="checkbox"
            checked={settings.autoSend}
            onChange={(e) => voice.setAutoSend(e.target.checked)}
            data-orb-voice-auto-send
          />
        </label>

        <label className="flex cursor-pointer items-start justify-between gap-3 rounded-xl border border-[var(--orb-line)] bg-[var(--orb-surface)] px-4 py-3">
          <span>
            <span className="block text-sm font-medium text-[var(--orb-foreground)]">Privacy mode</span>
            <span className="mt-0.5 block text-xs text-[var(--orb-muted)]">
              Text-first — no automatic spoken replies. Use Speak again when needed.
            </span>
          </span>
          <input
            type="checkbox"
            checked={settings.privacyMode}
            onChange={(e) => voice.setPrivacyMode(e.target.checked)}
            data-orb-voice-privacy-mode
          />
        </label>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void voice.previewVoiceProfile(settings.voicePresetId)}
            className="rounded-xl border border-[var(--orb-line)] px-4 py-2 text-sm font-medium text-[var(--orb-foreground)] hover:bg-[var(--orb-surface-hover)]"
            data-orb-voice-test
          >
            Preview voice
          </button>
          <button
            type="button"
            onClick={() => voice.resetVoiceSettings()}
            className="rounded-xl border border-[var(--orb-line)] px-4 py-2 text-sm text-[var(--orb-muted)] hover:bg-[var(--orb-surface-hover)]"
            data-orb-voice-reset
          >
            Reset
          </button>
        </div>

        <button
          type="button"
          className="flex w-full items-center justify-between rounded-xl border border-[var(--orb-line)]/60 px-4 py-2.5 text-left text-xs font-medium text-[var(--orb-muted)]"
          onClick={() => setAdvancedOpen((v) => !v)}
          data-orb-voice-advanced-toggle
          aria-expanded={advancedOpen}
        >
          Advanced voice settings
          <span aria-hidden>{advancedOpen ? '−' : '+'}</span>
        </button>

        {advancedOpen ? (
          <div className="space-y-3 rounded-xl border border-[var(--orb-line)]/40 p-3" data-orb-voice-advanced>
            <dl className="grid gap-2 text-[11px]">
              <div className="flex justify-between gap-3">
                <dt className="text-[var(--orb-muted)]">System voice</dt>
                <dd data-orb-voice-system-voice>{preferredVoiceName || 'Automatic match'}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-[var(--orb-muted)]">Premium voice</dt>
                <dd data-orb-voice-premium-status>
                  {providerStatus?.premium_available
                    ? 'Available (provider enabled)'
                    : providerStatus?.premium_enabled_by_provider
                      ? 'Provider on — server not configured'
                      : 'Off'}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-[var(--orb-muted)]">Speech recognition</dt>
                <dd>
                  {voice.recognitionAvailable || detectSpeechRecognitionSupported()
                    ? 'Available'
                    : 'Unavailable'}
                </dd>
              </div>
            </dl>

            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-[var(--orb-muted)]">
                Browser voice override
              </span>
              <select
                value={settings.selectedVoiceUri ?? ''}
                onChange={(e) => voice.setSelectedVoiceUri(e.target.value || null)}
                className="orb-profile-input w-full"
                data-orb-voice-select
              >
                <option value="">Automatic — {orbVoiceProfileLabel(settings.voicePresetId)}</option>
                {availableVoices.map((v) => (
                  <option key={v.voiceURI} value={v.voiceURI}>
                    {v.name} ({v.lang})
                  </option>
                ))}
              </select>
            </label>

            <label className="flex cursor-pointer items-start justify-between gap-3 rounded-lg border border-[var(--orb-line)]/50 px-3 py-2">
              <span className="text-xs text-[var(--orb-muted)]">
                Sensitive spoken replies (high-risk topics) — only when your organisation allows this.
              </span>
              <input
                type="checkbox"
                checked={settings.sensitiveSpokenReplies}
                onChange={(e) => voice.setSensitiveSpokenReplies(e.target.checked)}
                data-orb-voice-sensitive-spoken
              />
            </label>

            <label className="flex cursor-pointer items-start justify-between gap-3 rounded-lg border border-[var(--orb-line)]/50 px-3 py-2">
              <span className="text-xs text-[var(--orb-muted)]">Push-to-talk</span>
              <input
                type="checkbox"
                checked={settings.pushToTalk}
                onChange={(e) => voice.setPushToTalk(e.target.checked)}
                data-orb-voice-push-to-talk
              />
            </label>

            <label className="flex cursor-pointer items-start justify-between gap-3 rounded-lg border border-[var(--orb-line)]/50 px-3 py-2">
              <span className="text-xs text-[var(--orb-muted)]">Allow interruption</span>
              <input
                type="checkbox"
                checked={settings.allowInterruption}
                onChange={(e) => voice.setAllowInterruption(e.target.checked)}
                data-orb-voice-allow-interruption
              />
            </label>

            <label className="flex cursor-pointer items-start justify-between gap-3 rounded-lg border border-[var(--orb-line)]/50 px-3 py-2">
              <span className="text-xs text-[var(--orb-muted)]">Browser voice fallback</span>
              <input
                type="checkbox"
                checked={settings.useBrowserFallback}
                onChange={(e) => voice.setUseBrowserFallback(e.target.checked)}
                data-orb-voice-browser-fallback
              />
            </label>

            {developerMode ? (
              <p className="text-[10px] text-[var(--orb-muted)]" data-orb-voice-dev-profile-id>
                Profile id: {settings.voicePresetId}
              </p>
            ) : null}
          </div>
        ) : null}

        {voiceSelectionNote ? (
          <p className="rounded-lg border border-amber-200/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100" role="status">
            {voiceSelectionNote}
          </p>
        ) : null}

        <p className="text-[11px] leading-5 text-[var(--orb-muted)]" data-orb-voice-settings-audio-storage>
          {ORB_VOICE_AUDIO_TRANSCRIPT_REVIEW_NOTE}
        </p>

        <p className="text-[11px] leading-5 text-[var(--orb-muted)]" data-orb-voice-settings-privacy>
          Privacy: audio and transcripts stay in this session unless you save or send them elsewhere. Retention controls
          are being finalised for closed pilot.
        </p>
        <a
          href="/orb/privacy"
          className="text-[11px] font-semibold text-[var(--orb-primary,#1677ff)] hover:underline"
          data-orb-voice-settings-privacy-link
        >
          ORB Privacy &amp; Data Handling
        </a>
        <div className="space-y-1" data-orb-voice-settings-boundary>
          {ORB_VOICE_BOUNDARY_COPY.map((line) => (
            <p key={line} className="text-[10px] leading-4 text-[var(--orb-muted)]">
              {line}
            </p>
          ))}
        </div>
      </div>
    </OrbStandalonePanelShell>
  )
}
