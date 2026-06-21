'use client'

import {
  ORB_VOICE_ADULT_REVIEW_LABEL,
  ORB_VOICE_SUMMARY_ACTION_COPY,
  ORB_VOICE_SUMMARY_OPEN_WRITE,
  ORB_VOICE_SUMMARY_SAVE_REFLECTION,
  ORB_VOICE_SUMMARY_SEND_DICTATE
} from '@/lib/orb/voice/orb-voice-reflective-copy'
import type { OrbVoiceReflectiveSummary } from '@/lib/orb/voice/orb-voice-reflective-summary'

export function OrbVoiceSummaryPanel({
  summary,
  onCopySummary,
  onSendToDictate,
  onOpenWrite,
  onSaveReflection,
  saving = false,
  className = ''
}: {
  summary: OrbVoiceReflectiveSummary
  onCopySummary: () => void
  onSendToDictate?: () => void
  onOpenWrite?: () => void
  onSaveReflection?: () => void
  saving?: boolean
  className?: string
}) {
  return (
    <section
      className={`orb-voice-summary w-full space-y-4 text-left ${className}`.trim()}
      data-orb-voice-summary-panel
      data-orb-voice-summary-ready
    >
      <div data-orb-voice-summary-header>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--orb-muted)]" data-orb-voice-adult-review-label>
          {ORB_VOICE_ADULT_REVIEW_LABEL}
        </p>
        <p className="mt-1 text-sm font-semibold text-[var(--orb-foreground)]">Voice reflection summary</p>
      </div>

      <div className="space-y-3" data-orb-voice-summary-sections>
        {summary.sections.map((section) => (
          <div key={section.heading} data-orb-voice-summary-section>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--orb-muted)]">
              {section.heading}
            </p>
            <p className="mt-1 text-sm leading-6 text-[var(--orb-foreground)] whitespace-pre-wrap">{section.body}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2" data-orb-voice-summary-actions>
        <button
          type="button"
          className="w-full rounded-full border border-[var(--orb-line)]/60 py-2.5 text-sm font-medium text-[var(--orb-foreground)]"
          onClick={onCopySummary}
          data-orb-voice-copy-summary
        >
          {ORB_VOICE_SUMMARY_ACTION_COPY}
        </button>
        {onSendToDictate ? (
          <button
            type="button"
            className="w-full rounded-full bg-gradient-to-r from-[var(--orb-primary-blue,#168bff)] to-[var(--orb-primary-blue-2,#0d5fcc)] py-2.5 text-sm font-semibold text-white"
            onClick={onSendToDictate}
            data-orb-voice-send-to-dictate
          >
            {ORB_VOICE_SUMMARY_SEND_DICTATE}
          </button>
        ) : null}
        {onOpenWrite ? (
          <button
            type="button"
            className="w-full rounded-full border border-[var(--orb-line)]/60 py-2.5 text-sm font-medium text-[var(--orb-foreground)]"
            onClick={onOpenWrite}
            data-orb-voice-open-write
          >
            {ORB_VOICE_SUMMARY_OPEN_WRITE}
          </button>
        ) : null}
        {onSaveReflection ? (
          <button
            type="button"
            className="w-full rounded-full border border-[var(--orb-line)]/60 py-2.5 text-sm font-medium text-[var(--orb-muted)] disabled:opacity-50"
            onClick={onSaveReflection}
            disabled={saving}
            data-orb-voice-save-reflection
          >
            {saving ? 'Saving…' : ORB_VOICE_SUMMARY_SAVE_REFLECTION}
          </button>
        ) : null}
      </div>
    </section>
  )
}
