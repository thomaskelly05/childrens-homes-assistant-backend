'use client'

import { useStandaloneOrbVoice } from '@/components/orb-standalone/use-standalone-orb-voice'
import { OrbStandalonePanelShell } from '@/components/orb-standalone/orb-standalone-panel-shell'
import {
  ORB_SPEECH_RATE_PRESETS,
  speechRatePresetFor,
  type OrbSpeechRatePreset
} from '@/lib/orb/orb-voice-presets'
import { ORB_VOICE_MODES, ORB_VOICE_PRESETS } from '@/lib/orb/voice/orb-voice-types'
import type { OrbSpokenAnswerLength, OrbVoiceModeId, OrbVoicePresetId } from '@/lib/orb/voice/orb-voice-types'

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

export function OrbVoiceSettingsPanel({
  open,
  onClose,
  onOpenOrbVoice
}: {
  open: boolean
  onClose: () => void
  onOpenOrbVoice?: () => void
}) {
  const voice = useStandaloneOrbVoice()
  const { settings, availableVoices, preferredVoiceName, preferredVoiceIsBritishFemale, voiceSelectionNote } =
    voice
  const activeRate = speechRatePresetFor(settings.speechRate)

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
          British female voice where available on this device. Premium neural voices only apply when your
          deployment configures a server provider — otherwise ORB uses browser Speech Synthesis.
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

        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-[var(--orb-muted)]">Selected voice</span>
          <select
            value={settings.voicePresetId}
            onChange={(e) => voice.setVoicePresetId(e.target.value as OrbVoicePresetId)}
            className="orb-profile-input w-full"
            data-orb-voice-preset
          >
            {ORB_VOICE_PRESETS.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.label}
              </option>
            ))}
          </select>
        </label>

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
                ? `Best match: ${preferredVoiceName}${preferredVoiceIsBritishFemale ? ' (British female)' : ''}`
                : 'Automatic — British female where available'}
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
            <span className="mt-0.5 block text-xs text-[var(--orb-muted)]">Show save in ORB Voice when a session has turns.</span>
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
