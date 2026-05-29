'use client'

import { useStandaloneOrbVoice } from '@/components/orb-standalone/use-standalone-orb-voice'
import { OrbStandalonePanelShell } from '@/components/orb-standalone/orb-standalone-panel-shell'
import {
  ORB_SPEECH_RATE_PRESETS,
  speechRatePresetFor,
  type OrbSpeechRatePreset
} from '@/lib/orb/orb-voice-presets'

const RATE_LABELS: Record<OrbSpeechRatePreset, string> = {
  slow: 'Slow',
  normal: 'Normal',
  fast: 'Fast'
}

function voiceServiceHint(voice: SpeechSynthesisVoice): string {
  const local = voice.localService ? 'local' : 'remote'
  return `${voice.lang} · ${local}`
}

export function OrbVoiceSettingsPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const voice = useStandaloneOrbVoice()
  const { settings, availableVoices, preferredVoiceName, preferredVoiceIsBritishFemale, voiceSelectionNote } =
    voice
  const activeRate = speechRatePresetFor(settings.speechRate)

  return (
    <OrbStandalonePanelShell
      open={open}
      title="Voice"
      subtitle="Speech output and auto-speak"
      onClose={onClose}
      ariaLabel="ORB voice settings"
      panelId="voice"
    >
      <div className="space-y-4 p-4" data-orb-voice-settings-panel>
        <p className="text-[11px] leading-6 text-[var(--orb-muted)]" data-orb-voice-settings-help>
          ORB can read responses aloud using your device/browser voices. Voice quality depends on Safari, Chrome,
          macOS, iOS, Windows or Android. Choose the voice that feels most natural for you. Where possible, ORB will
          default to a British female voice.
        </p>

        <label className="flex cursor-pointer items-start justify-between gap-3 rounded-xl border border-[var(--orb-line)] bg-[var(--orb-surface)] px-4 py-3">
          <span>
            <span className="block text-sm font-medium text-[var(--orb-foreground)]">Read aloud enabled</span>
            <span className="mt-0.5 block text-xs text-[var(--orb-muted)]">
              Auto-speak completed answers when on. Per-message Speak works whenever your browser supports synthesis.
            </span>
          </span>
          <input
            type="checkbox"
            checked={settings.voiceReplies}
            onChange={(e) => voice.setVoiceReplies(e.target.checked)}
            data-orb-voice-auto-speak
          />
        </label>

        {voiceSelectionNote ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900" role="status">
            {voiceSelectionNote}
          </p>
        ) : null}

        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-[var(--orb-muted)]">Preferred voice</span>
          <select
            value={settings.selectedVoiceUri ?? ''}
            onChange={(e) => voice.setSelectedVoiceUri(e.target.value || null)}
            className="orb-profile-input w-full"
            data-orb-voice-select
          >
            <option value="">
              {preferredVoiceName
                ? `Best match: ${preferredVoiceName}${preferredVoiceIsBritishFemale ? ' (British female)' : ''}`
                : 'Automatic — British female when available'}
            </option>
            {availableVoices.map((v) => (
              <option key={v.voiceURI} value={v.voiceURI}>
                {v.name} ({voiceServiceHint(v)})
              </option>
            ))}
          </select>
        </label>

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
          Speech synthesis is output only — it does not use your microphone. Voice input remains push-to-talk from the
          composer.
        </p>
      </div>
    </OrbStandalonePanelShell>
  )
}
