'use client'

import { useStandaloneOrbVoice } from '@/components/orb-standalone/use-standalone-orb-voice'
import { OrbStandalonePanelShell } from '@/components/orb-standalone/orb-standalone-panel-shell'

export function OrbVoiceSettingsPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const voice = useStandaloneOrbVoice()
  const { settings, availableVoices, preferredVoiceName, preferredVoiceIsBritishFemale, voiceSelectionNote } = voice

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
        <label className="flex cursor-pointer items-start justify-between gap-3 rounded-xl border border-[var(--orb-line)] bg-[var(--orb-surface)] px-4 py-3">
          <span>
            <span className="block text-sm font-medium text-[var(--orb-foreground)]">Auto-speak responses</span>
            <span className="mt-0.5 block text-xs text-[var(--orb-muted)]">
              Read assistant answers aloud when complete. Off by default for privacy.
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
                {v.name} ({v.lang})
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1.5 flex justify-between text-xs font-medium text-[var(--orb-muted)]">
            <span>Speed</span>
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

        <label className="block">
          <span className="mb-1.5 flex justify-between text-xs font-medium text-[var(--orb-muted)]">
            <span>Pitch</span>
            <span>{settings.speechPitch.toFixed(2)}</span>
          </span>
          <input
            type="range"
            min={0.85}
            max={1.15}
            step={0.01}
            value={settings.speechPitch}
            onChange={(e) => voice.setSpeechPitch(Number(e.target.value))}
            className="w-full"
            data-orb-voice-pitch
          />
        </label>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => voice.testSelectedVoice()}
            className="rounded-xl border border-[var(--orb-line)] px-4 py-2 text-sm font-medium text-[var(--orb-foreground)] hover:bg-[var(--orb-surface-hover)]"
            data-orb-voice-test
          >
            Test voice
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
