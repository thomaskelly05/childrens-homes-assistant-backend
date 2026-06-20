'use client'

import { useCallback, useRef } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import {
  ORB_VOICE_REASONING_OPTIONS,
  ORB_VOICE_STYLE_OPTIONS,
  describeVoiceModeSelection,
  type OrbVoiceReasoningModeId,
  type OrbVoiceStyleId
} from '@/lib/orb/orb-voice-mode-carousel'

function scrollCarousel(
  container: HTMLDivElement | null,
  direction: 'prev' | 'next'
) {
  if (!container) return
  const amount = Math.max(container.clientWidth * 0.72, 160)
  container.scrollBy({ left: direction === 'next' ? amount : -amount, behavior: 'smooth' })
}

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
  const activeStyle = ORB_VOICE_STYLE_OPTIONS.find((option) => option.id === voiceStyle)
  const activeReasoning = ORB_VOICE_REASONING_OPTIONS.find((option) => option.id === reasoningMode)
  const styleTrackRef = useRef<HTMLDivElement>(null)
  const reasoningTrackRef = useRef<HTMLDivElement>(null)

  const scrollStyle = useCallback((direction: 'prev' | 'next') => {
    scrollCarousel(styleTrackRef.current, direction)
  }, [])

  const scrollReasoning = useCallback((direction: 'prev' | 'next') => {
    scrollCarousel(reasoningTrackRef.current, direction)
  }, [])

  return (
    <div
      className="orb-voice-mode-selector w-full max-w-2xl space-y-3"
      data-orb-voice-mode-selector
      data-orb-voice-mode-central
      data-orb-voice-main-mode-controls
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
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--orb-muted)]">Voice style</p>
          <div className="flex gap-1">
            <button
              type="button"
              className="orb-voice-mode-selector__nav inline-flex h-7 w-7 items-center justify-center rounded-full border border-[var(--orb-line)]/50 text-[var(--orb-muted)] hover:text-[var(--orb-foreground)]"
              aria-label="Previous voice styles"
              onClick={() => scrollStyle('prev')}
              data-orb-voice-style-carousel-prev
            >
              <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
            </button>
            <button
              type="button"
              className="orb-voice-mode-selector__nav inline-flex h-7 w-7 items-center justify-center rounded-full border border-[var(--orb-line)]/50 text-[var(--orb-muted)] hover:text-[var(--orb-foreground)]"
              aria-label="Next voice styles"
              onClick={() => scrollStyle('next')}
              data-orb-voice-style-carousel-next
            >
              <ChevronRight className="h-3.5 w-3.5" aria-hidden />
            </button>
          </div>
        </div>
        <div
          ref={styleTrackRef}
          className="orb-voice-mode-carousel flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="radiogroup"
          aria-label="Voice style"
          data-orb-voice-style-carousel
        >
          {ORB_VOICE_STYLE_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={voiceStyle === option.id}
              className={`orb-voice-mode-carousel__chip shrink-0 snap-start rounded-full px-3 py-1.5 text-[11px] font-medium ${
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
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--orb-muted)]">Reasoning mode</p>
          <div className="flex gap-1">
            <button
              type="button"
              className="orb-voice-mode-selector__nav inline-flex h-7 w-7 items-center justify-center rounded-full border border-[var(--orb-line)]/50 text-[var(--orb-muted)] hover:text-[var(--orb-foreground)]"
              aria-label="Previous reasoning modes"
              onClick={() => scrollReasoning('prev')}
              data-orb-voice-reasoning-carousel-prev
            >
              <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
            </button>
            <button
              type="button"
              className="orb-voice-mode-selector__nav inline-flex h-7 w-7 items-center justify-center rounded-full border border-[var(--orb-line)]/50 text-[var(--orb-muted)] hover:text-[var(--orb-foreground)]"
              aria-label="Next reasoning modes"
              onClick={() => scrollReasoning('next')}
              data-orb-voice-reasoning-carousel-next
            >
              <ChevronRight className="h-3.5 w-3.5" aria-hidden />
            </button>
          </div>
        </div>
        <div
          ref={reasoningTrackRef}
          className="orb-voice-mode-carousel flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="radiogroup"
          aria-label="Reasoning mode"
          data-orb-voice-reasoning-carousel
        >
          {ORB_VOICE_REASONING_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={reasoningMode === option.id}
              className={`orb-voice-mode-carousel__chip shrink-0 snap-start rounded-full px-3 py-1.5 text-[11px] font-medium ${
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
