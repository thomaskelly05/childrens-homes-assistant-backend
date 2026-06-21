'use client'

import { ORB_VOICE_MODE_PROMPT } from '@/lib/orb/voice/orb-voice-reflective-copy'
import {
  ORB_VOICE_REFLECTIVE_MODES,
  type OrbVoiceReflectiveModeId
} from '@/lib/orb/voice/orb-voice-reflective-modes'

export function OrbVoiceReflectiveModeSelector({
  value,
  onChange,
  disabled = false,
  className = ''
}: {
  value: OrbVoiceReflectiveModeId
  onChange: (modeId: OrbVoiceReflectiveModeId) => void
  disabled?: boolean
  className?: string
}) {
  const active = ORB_VOICE_REFLECTIVE_MODES.find((m) => m.id === value)

  return (
    <div
      className={`orb-voice-reflective-mode w-full max-w-md space-y-2 ${className}`.trim()}
      data-orb-voice-reflective-mode-selector
      data-orb-voice-topic-selector
    >
      <label
        htmlFor="orb-voice-reflective-mode"
        className="block text-center text-xs font-medium text-[var(--orb-muted)]"
        data-orb-voice-mode-prompt
      >
        {ORB_VOICE_MODE_PROMPT}
      </label>
      <select
        id="orb-voice-reflective-mode"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value as OrbVoiceReflectiveModeId)}
        className="w-full rounded-xl border border-[var(--orb-line)]/50 bg-[var(--orb-surface-elevated)]/60 px-3 py-2.5 text-sm text-[var(--orb-foreground)] shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--orb-primary)]/30 disabled:opacity-60"
        data-orb-voice-reflective-mode-select
      >
        {ORB_VOICE_REFLECTIVE_MODES.map((mode) => (
          <option key={mode.id} value={mode.id} data-orb-voice-reflective-mode-option={mode.id}>
            {mode.label}
          </option>
        ))}
      </select>
      {active ? (
        <p className="text-center text-[11px] leading-relaxed text-[var(--orb-muted)]" data-orb-voice-reflective-mode-hint>
          {active.hint}
        </p>
      ) : null}
    </div>
  )
}
