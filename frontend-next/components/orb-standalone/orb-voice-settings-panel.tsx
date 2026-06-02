'use client'

import { useStandaloneOrbVoice } from '@/components/orb-standalone/use-standalone-orb-voice'
import { OrbStandalonePanelShell } from '@/components/orb-standalone/orb-standalone-panel-shell'
import { isOrbDeveloperMode } from '@/lib/orb/orb-developer-mode'
import {
  ORB_SPEECH_RATE_PRESETS,
  speechRatePresetFor,
  type OrbSpeechRatePreset
} from '@/lib/orb/orb-voice-presets'
import { ORB_VOICE_PROFILES, getOrbVoiceProfile, orbVoiceProfileLabel } from '@/lib/orb/voice/orb-voice-profiles'
import { ORB_VOICE_MODES } from '@/lib/orb/voice/orb-voice-types'
import type { OrbSpokenAnswerLength, OrbVoiceModeId, OrbVoicePresetId } from '@/lib/orb/voice/orb-voice-types'
import { ORB_VOICE_BOUNDARY_COPY } from '@/lib/orb/voice/orb-voice-launch-mode'
import { detectSpeechRecognitionSupported } from '@/lib/orb/voice/orb-voice-readiness'

const RATE_LABELS: Record<OrbSpeechRatePreset, string> = {
  slow: 'Slow',
  normal: 'Normal',
  fast: 'Fast'
}

const LENGTH_LABELS: Record<OrbSpokenAnswerLength, string> = {
  short: 'Short',
  balanced: 'Balanced',
  detailed: 'Detailed'
}

function voiceServiceHint(voice: SpeechSynthesisVoice): string {
  const local = voice.localService ? 'local' : 'remote'
  return `${voice.lang} · ${local}`
}

type VoiceSettingsCompat = ReturnType<typeof useStandaloneOrbVoice> & {
  preferredVoiceIsBritishFemale: boolean
  setReadAloudProfileId: (profileId: OrbVoicePresetId | null) => void
  setVoiceAsDefault: () => void
  previewVoiceProfile: (profileId?: OrbVoicePresetId) => void | Promise<void>
  setSpokenAnswerLength: (length: OrbSpokenAnswerLength) => void
  setAllowInterruption: (enabled: boolean) => void
  setPushToTalk: (enabled: boolean) => void
  setSaveTranscript: (enabled: boolean) => void
  setUseBrowserFallback: (enabled: boolean) => void
  setAutoSend: (enabled: boolean) => void
}

function looksBritishFemaleVoice(name: string | null): boolean {
  if (!name) return false
  const lower = name.toLowerCase()
  return (
    (lower.includes('female') || lower.includes('sonia') || lower.includes('libby') || lower.includes('serena') || lower.includes('kate')) &&
    (lower.includes('uk') || lower.includes('gb') || lower.includes('british') || lower.includes('sonia') || lower.includes('libby'))
  )
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
    preferredVoiceIsBritishFemale: looksBritishFemaleVoice(baseVoice.preferredVoiceName),
    setReadAloudProfileId: (profileId: OrbVoicePresetId | null) =>
      baseVoice.updateSettings({ readAloudProfileId: profileId }),
    setVoiceAsDefault: () => baseVoice.updateSettings({ readAloudProfileId: baseVoice.settings.voicePresetId }),
    previewVoiceProfile: (_profileId?: OrbVoicePresetId) => baseVoice.testSelectedVoice(),
    setSpokenAnswerLength: (spokenAnswerLength: OrbSpokenAnswerLength) =>
      baseVoice.updateSettings({ spokenAnswerLength }),
    setAllowInterruption: (allowInterruption: boolean) => baseVoice.updateSettings({ allowInterruption }),
    setPushToTalk: (pushToTalk: boolean) => baseVoice.updateSettings({ pushToTalk }),
    setSaveTranscript: (saveTranscript: boolean) => baseVoice.updateSettings({ saveTranscript }),
    setUseBrowserFallback: (useBrowserFallback: boolean) => baseVoice.updateSettings({ useBrowserFallback }),
    setAutoSend: (autoSend: boolean) => baseVoice.updateSettings({ autoSend })
  } satisfies VoiceSettingsCompat
  const { settings, availableVoices, preferredVoiceName, preferredVoiceIsBritishFemale, voiceSelectionNote } =
    voice
  const activeRate = speechRatePresetFor(settings.speechRate)
  const developerMode = isOrbDeveloperMode()
  const selectedProfile = getOrbVoiceProfile(settings.voicePresetId)
  const readAloudProfile = getOrbVoiceProfile(settings.readAloudProfileId ?? settings.voicePresetId)

  return (
    <OrbStandalonePanelShell
      open={open}
      title="Voice"
      subtitle="Speech, modes and ORB Voice preferences"
      onClose={onClose}
      ariaLabel="ORB voice settings"
      panelId="voice"
    >
      <div className="space-y-4 p-4" data-orb-voice-settings-panel>
        <p className="text-[11px] leading-6 text-[var(--orb-muted)]" data-orb-voice-settings-help>
          Choose how ORB sounds. ORB-branded voices use OpenAI Realtime when your deployment configures it;
          otherwise ORB honestly uses your browser&apos;s Speech Synthesis with the closest matching device voice.
        </p>

        <dl className="grid gap-2 rounded-xl border border-[var(--orb-line)]/40 p-3 text-[11px]" data-orb-voice-capability-status>
          <div className="flex justify-between gap-3">
            <dt className="text-[var(--orb-muted)]">Speech recognition</dt>
            <dd data-orb-voice-recognition-available={voice.recognitionAvailable ? 'true' : 'false'}>
              {voice.recognitionAvailable || detectSpeechRecognitionSupported() ? 'Available' : 'Unavailable'}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-[var(--orb-muted)]">Speech synthesis</dt>
            <dd data-orb-voice-synthesis-available={voice.synthesisAvailable ? 'true' : 'false'}>
              {voice.synthesisAvailable ? 'Available' : 'Unavailable'}
            </dd>
          </div>
        </dl>

        <p className="text-[11px] leading-6 text-[var(--orb-muted)]" data-orb-voice-settings-privacy>
          Privacy: audio and transcripts are used only for the current interaction unless you save them.
        </p>
        <div className="space-y-1" data-orb-voice-settings-boundary>
          {ORB_VOICE_BOUNDARY_COPY.map((line) => (
            <p key={line} className="text-[10px] leading-4 text-[var(--orb-muted)]">
              {line}
            </p>
          ))}
        </div>

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
          <span className="mb-1.5 block text-xs font-medium text-[var(--orb-muted)]">Default voice mode</span>
          <select
            value={settings.voiceMode}
            onChange={(e) => voice.setVoiceMode(e.target.value as OrbVoiceModeId)}
            className="orb-profile-input w-full"
            data-orb-voice-default-mode
          >
            {ORB_VOICE_MODES.map((mode) => (
              <option key={mode.id} value={mode.id}>
                {mode.label}
              </option>
            ))}
          </select>
        </label>

        <fieldset className="space-y-3" data-orb-voice-profile-list>
          <legend className="text-xs font-medium text-[var(--orb-muted)]">Selected voice</legend>
          {ORB_VOICE_PROFILES.map((profile) => {
            const selected = settings.voicePresetId === profile.id
            return (
              <div
                key={profile.id}
                className={`rounded-xl border px-4 py-3 transition ${
                  selected
                    ? 'border-[#0284C7] bg-[#E0F2FE]/10'
                    : 'border-[var(--orb-line)] bg-[var(--orb-surface)]'
                }`}
                data-orb-voice-profile-card={profile.id}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-[var(--orb-foreground)]" data-orb-voice-profile-label>
                      {profile.label}
                    </p>
                    <p className="mt-0.5 text-xs text-[var(--orb-muted)]">{profile.description}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {profile.bestFor.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full border border-[var(--orb-line)]/60 px-2 py-0.5 text-[10px] text-[var(--orb-muted)]"
                          data-orb-voice-profile-tag
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    {developerMode && profile.openaiVoice ? (
                      <p className="mt-1 text-[10px] text-[var(--orb-muted)]" data-orb-voice-dev-openai-id>
                        OpenAI voice: {profile.openaiVoice}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <button
                      type="button"
                      onClick={() => void voice.previewVoiceProfile(profile.id as OrbVoicePresetId)}
                      className="rounded-lg border border-[var(--orb-line)] px-3 py-1.5 text-[11px] font-medium text-[var(--orb-foreground)] hover:bg-[var(--orb-surface-hover)]"
                      data-orb-voice-preview
                    >
                      Preview voice
                    </button>
                    <button
                      type="button"
                      onClick={() => voice.setVoicePresetId(profile.id as OrbVoicePresetId)}
                      className={`rounded-lg px-3 py-1.5 text-[11px] font-medium ${
                        selected
                          ? 'bg-[#0284C7] text-white'
                          : 'border border-[var(--orb-line)] text-[var(--orb-muted)] hover:bg-[var(--orb-surface-hover)]'
                      }`}
                      data-orb-voice-use-for-orb
                    >
                      {selected ? 'ORB Voice voice' : 'Use for ORB Voice'}
                    </button>
                    <button
                      type="button"
                      onClick={() => voice.setReadAloudProfileId(profile.id as OrbVoicePresetId)}
                      className="rounded-lg border border-[var(--orb-line)] px-3 py-1.5 text-[11px] text-[var(--orb-muted)] hover:bg-[var(--orb-surface-hover)]"
                      data-orb-voice-use-read-aloud
                    >
                      Use for read aloud
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </fieldset>

        <p className="text-xs text-[var(--orb-muted)]">
          ORB Voice: <strong className="font-medium text-[var(--orb-foreground)]">{selectedProfile.label}</strong>
          {' · '}
          Read aloud: <strong className="font-medium text-[var(--orb-foreground)]">{readAloudProfile.label}</strong>
        </p>

        <button
          type="button"
          onClick={() => voice.setVoiceAsDefault()}
          className="w-full rounded-xl border border-[var(--orb-line)] px-4 py-2 text-sm font-medium text-[var(--orb-foreground)] hover:bg-[var(--orb-surface-hover)]"
          data-orb-voice-set-default
        >
          Set current ORB Voice selection as default for read aloud
        </button>

        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-[var(--orb-muted)]">Browser voice override</span>
          <select
            value={settings.selectedVoiceUri ?? ''}
            onChange={(e) => voice.setSelectedVoiceUri(e.target.value || null)}
            className="orb-profile-input w-full"
            data-orb-voice-select
          >
            <option value="">
              {preferredVoiceName
                ? `Profile match: ${preferredVoiceName}${preferredVoiceIsBritishFemale ? ' (British female)' : ''}`
                : `Automatic — ${orbVoiceProfileLabel(settings.voicePresetId)}`}
            </option>
            {availableVoices.map((v) => (
              <option key={v.voiceURI} value={v.voiceURI}>
                {v.name} ({voiceServiceHint(v)})
              </option>
            ))}
          </select>
        </label>

        <fieldset>
          <legend className="mb-2 text-xs font-medium text-[var(--orb-muted)]">Spoken answer length</legend>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Spoken answer length">
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
            <span className="block text-sm font-medium text-[var(--orb-foreground)]">Auto-speak ORB replies</span>
            <span className="mt-0.5 block text-xs text-[var(--orb-muted)]">
              Speak completed answers automatically. Per-message Speak always works when supported.
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
            <span className="block text-sm font-medium text-[var(--orb-foreground)]">Allow interruption</span>
            <span className="mt-0.5 block text-xs text-[var(--orb-muted)]">Stop ORB mid-speech and listen again.</span>
          </span>
          <input
            type="checkbox"
            checked={settings.allowInterruption}
            onChange={(e) => voice.setAllowInterruption(e.target.checked)}
            data-orb-voice-allow-interruption
          />
        </label>

        <label className="flex cursor-pointer items-start justify-between gap-3 rounded-xl border border-[var(--orb-line)] bg-[var(--orb-surface)] px-4 py-3">
          <span>
            <span className="block text-sm font-medium text-[var(--orb-foreground)]">Push-to-talk</span>
            <span className="mt-0.5 block text-xs text-[var(--orb-muted)]">
              When off, ORB Voice listens again after speaking (within an active session only).
            </span>
          </span>
          <input
            type="checkbox"
            checked={settings.pushToTalk}
            onChange={(e) => voice.setPushToTalk(e.target.checked)}
            data-orb-voice-push-to-talk
          />
        </label>

        <label className="flex cursor-pointer items-start justify-between gap-3 rounded-xl border border-[var(--orb-line)] bg-[var(--orb-surface)] px-4 py-3">
          <span>
            <span className="block text-sm font-medium text-[var(--orb-foreground)]">Auto-send after speech</span>
            <span className="mt-0.5 block text-xs text-[var(--orb-muted)]">Composer mic sends when transcription is ready.</span>
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
            <span className="block text-sm font-medium text-[var(--orb-foreground)]">Save transcript</span>
            <span className="mt-0.5 block text-xs text-[var(--orb-muted)]">Legacy preference — Save to ORB is always offered when a transcript exists.</span>
          </span>
          <input
            type="checkbox"
            checked={settings.saveTranscript}
            onChange={(e) => voice.setSaveTranscript(e.target.checked)}
            data-orb-voice-save-transcript-setting
          />
        </label>

        <label className="flex cursor-pointer items-start justify-between gap-3 rounded-xl border border-[var(--orb-line)] bg-[var(--orb-surface)] px-4 py-3">
          <span>
            <span className="block text-sm font-medium text-[var(--orb-foreground)]">Use browser voice fallback</span>
            <span className="mt-0.5 block text-xs text-[var(--orb-muted)]">Prefer device Speech Synthesis when server TTS is unavailable.</span>
          </span>
          <input
            type="checkbox"
            checked={settings.useBrowserFallback}
            onChange={(e) => voice.setUseBrowserFallback(e.target.checked)}
            data-orb-voice-browser-fallback
          />
        </label>

        {voiceSelectionNote ? (
          <p className="rounded-lg border border-amber-200/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100" role="status">
            {voiceSelectionNote}
          </p>
        ) : null}

        <fieldset>
          <legend className="mb-2 text-xs font-medium text-[var(--orb-muted)]">Speech rate</legend>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Speech rate">
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
                data-orb-voice-rate={preset}
              >
                {RATE_LABELS[preset]}
              </button>
            ))}
          </div>
        </fieldset>

        <label className="block">
          <span className="mb-1.5 flex justify-between text-xs font-medium text-[var(--orb-muted)]">
            <span>Fine-tune speed</span>
            <span>{settings.speechRate.toFixed(2)}</span>
          </span>
          <input
            type="range"
            min={0.75}
            max={1.1}
            step={0.01}
            value={settings.speechRate}
            onChange={(e) => voice.setSpeechRate(Number(e.target.value))}
            className="w-full"
            data-orb-voice-speed
          />
        </label>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => voice.testSelectedVoice()}
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
            Reset voice settings
          </button>
        </div>

        <p className="text-[11px] leading-5 text-[var(--orb-muted)]">
          Voice starts only when you press Start in ORB Voice or the composer mic. There is no always-listening mode.
        </p>
      </div>
    </OrbStandalonePanelShell>
  )
}
