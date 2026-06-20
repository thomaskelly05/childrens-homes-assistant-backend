'use client'

import {
  ORB_VOICE_REASONING_OPTIONS,
  ORB_VOICE_STYLE_OPTIONS,
  describeVoiceModeSelection,
  type OrbVoiceReasoningModeId,
  type OrbVoiceStyleId
} from '@/lib/orb/orb-voice-mode-carousel'

export function OrbVoiceModeSelector({
  voiceStyle,
  reasoningMode,
  onVoiceStyleChange,
  onReasoningModeChange
}: {
  voiceStyle: OrbVoiceStyleId
  reasoningMode: OrbVoiceReasoningModeId
  onVoiceStyleChange: (style: OrbVoiceStyleId) => void
  onReasoningModeChange: (mode: OrbVoiceReasoningModeId) => void
}) {
  const selection = describeVoiceModeSelection(voiceStyle, reasoningMode)
  const activeStyle = ORB_VOICE_STYLE_OPTIONS[styleIndex]
  const activeReasoning = ORB_VOICE_REASONING_OPTIONS[reasoningIndex]

  return (
    <div
      className="orb-voice-mode-selector w-full max-w-lg space-y-2.5"
      data-orb-voice-mode-selector
      data-orb-voice-mode-central
    >
      <div className="orb-mode-selector__summary text-center" data-orb-voice-mode-summary role="status">
        <p
          className="text-sm font-semibold text-[var(--orb-foreground)]"
          data-orb-voice-mode-selection-label
          data-orb-voice-mode-headline
        >
          {selection.headline}
        </p>
        <p
          className="mt-1 text-xs leading-relaxed text-[var(--orb-muted)]"
          data-orb-voice-mode-selection-description
          data-orb-voice-mode-description
        >
          {selection.description}
        </p>
      </div>
      <div className="space-y-1.5" data-orb-voice-style-controls>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--orb-muted)]">Voice style</p>
        <div className="flex flex-wrap justify-center gap-1.5" role="radiogroup" aria-label="Voice style">
          {ORB_VOICE_STYLE_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={voiceStyle === option.id}
              className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                voiceStyle === option.id
                  ? 'bg-[var(--orb-res-navy,#0f172a)] text-white'
                  : 'border border-[var(--orb-line)]/60 text-[var(--orb-muted)] hover:text-[var(--orb-foreground)]'
              }`}
              onClick={() => onVoiceStyleChange(option.id)}
              data-orb-voice-style-option={option.id}
            >
              {option.label}
            </button>
          ))}
        </div>
        {activeStyle ? (
          <p
            className="text-center text-[11px] leading-relaxed text-[var(--orb-muted)]"
            data-orb-voice-style-description
          >
            {activeStyle.description}
          </p>
        ) : null}
      </div>

      <div className="space-y-1.5" data-orb-voice-reasoning-controls>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--orb-muted)]">Reasoning</p>
        <div className="flex flex-wrap justify-center gap-1.5" role="radiogroup" aria-label="Reasoning mode">
          {ORB_VOICE_REASONING_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={reasoningMode === option.id}
              className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                reasoningMode === option.id
                  ? 'bg-[var(--orb-res-navy,#0f172a)] text-white'
                  : 'border border-[var(--orb-line)]/60 text-[var(--orb-muted)] hover:text-[var(--orb-foreground)]'
              }`}
              onClick={() => onReasoningModeChange(option.id)}
              data-orb-voice-reasoning-option={option.id}
            >
              {option.label}
            </button>
          ))}
        </div>
        {activeReasoning ? (
          <p
            className="text-center text-[11px] leading-relaxed text-[var(--orb-muted)]"
            data-orb-voice-reasoning-description
          >
            {activeReasoning.description}
          </p>
        ) : null}
      </div>

    </div>
  )
}
