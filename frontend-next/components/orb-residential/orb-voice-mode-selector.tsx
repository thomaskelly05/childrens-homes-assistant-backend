'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'

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
  const styleIndex = ORB_VOICE_STYLE_OPTIONS.findIndex((option) => option.id === voiceStyle)
  const reasoningIndex = ORB_VOICE_REASONING_OPTIONS.findIndex((option) => option.id === reasoningMode)
  const selection = describeVoiceModeSelection(voiceStyle, reasoningMode)

  function shiftStyle(delta: number) {
    const next =
      ORB_VOICE_STYLE_OPTIONS[(styleIndex + delta + ORB_VOICE_STYLE_OPTIONS.length) % ORB_VOICE_STYLE_OPTIONS.length]
    onVoiceStyleChange(next.id)
  }

  function shiftReasoning(delta: number) {
    const next =
      ORB_VOICE_REASONING_OPTIONS[
        (reasoningIndex + delta + ORB_VOICE_REASONING_OPTIONS.length) % ORB_VOICE_REASONING_OPTIONS.length
      ]
    onReasoningModeChange(next.id)
  }

  return (
    <div className="orb-voice-mode-selector w-full max-w-md space-y-3" data-orb-voice-mode-selector>
      <div className="space-y-1.5">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--orb-muted)]">Voice style</p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="orb-voice-mode-selector__nav rounded-full border border-[var(--orb-line)] p-1.5 text-[var(--orb-muted)] hover:bg-[var(--orb-surface-hover)]"
            onClick={() => shiftStyle(-1)}
            aria-label="Previous voice style"
            data-orb-voice-style-prev
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </button>
          <div
            className="min-w-0 flex-1 rounded-full border border-[var(--orb-line)]/60 bg-[var(--orb-surface-elevated)] px-3 py-2 text-center text-sm font-medium text-[var(--orb-foreground)]"
            data-orb-voice-style-value
            role="status"
          >
            {ORB_VOICE_STYLE_OPTIONS[styleIndex]?.label ?? 'Calm'}
          </div>
          <button
            type="button"
            className="orb-voice-mode-selector__nav rounded-full border border-[var(--orb-line)] p-1.5 text-[var(--orb-muted)] hover:bg-[var(--orb-surface-hover)]"
            onClick={() => shiftStyle(1)}
            aria-label="Next voice style"
            data-orb-voice-style-next
          >
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
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
      </div>

      <div className="space-y-1.5">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--orb-muted)]">Reasoning mode</p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="orb-voice-mode-selector__nav rounded-full border border-[var(--orb-line)] p-1.5 text-[var(--orb-muted)] hover:bg-[var(--orb-surface-hover)]"
            onClick={() => shiftReasoning(-1)}
            aria-label="Previous reasoning mode"
            data-orb-voice-reasoning-prev
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </button>
          <div
            className="min-w-0 flex-1 rounded-full border border-[var(--orb-line)]/60 bg-[var(--orb-surface-elevated)] px-3 py-2 text-center text-sm font-medium text-[var(--orb-foreground)]"
            data-orb-voice-reasoning-value
            role="status"
          >
            {ORB_VOICE_REASONING_OPTIONS[reasoningIndex]?.label ?? 'Talk it through'}
          </div>
          <button
            type="button"
            className="orb-voice-mode-selector__nav rounded-full border border-[var(--orb-line)] p-1.5 text-[var(--orb-muted)] hover:bg-[var(--orb-surface-hover)]"
            onClick={() => shiftReasoning(1)}
            aria-label="Next reasoning mode"
            data-orb-voice-reasoning-next
          >
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
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
      </div>

      <div className="rounded-xl border border-[var(--orb-line)]/50 bg-[var(--orb-surface-elevated)]/70 px-3 py-2.5 text-center" data-orb-voice-mode-summary>
        <p className="text-xs font-semibold text-[var(--orb-foreground)]" data-orb-voice-mode-headline>
          {selection.headline}
        </p>
        <p className="mt-1 text-[11px] leading-relaxed text-[var(--orb-muted)]" data-orb-voice-mode-description>
          {selection.description}
        </p>
      </div>
    </div>
  )
}
