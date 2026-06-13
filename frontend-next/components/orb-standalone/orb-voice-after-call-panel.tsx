'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

import { OrbDictateTemplateSelector } from '@/components/orb/dictate/OrbDictateTemplateSelector'
import {
  buildOrbVoiceAfterCallContent,
  orbVoiceNeedsEscalationPrompt,
  type OrbVoiceAfterCallContent
} from '@/lib/orb/voice/orb-voice-after-call'
import type { OrbDictateStudioTemplate } from '@/lib/orb/dictate/orb-dictate-studio-templates'
import type { VoiceTurn } from '@/lib/orb/voice/orb-voice-types'

export function OrbVoiceAfterCallPanel({
  turns,
  transcriptText,
  voiceSummary,
  selectedTemplateId,
  onTemplateChange,
  onCreateDraftRecord,
  onSendToWrite,
  onContinueTalking,
  onCopyTranscript,
  onNewSession,
  className = ''
}: {
  turns: VoiceTurn[]
  transcriptText: string
  voiceSummary?: string | null
  selectedTemplateId: string
  onTemplateChange: (template: OrbDictateStudioTemplate) => void
  onCreateDraftRecord: (templateId: string) => void
  onSendToWrite?: () => void
  onContinueTalking: () => void
  onCopyTranscript: () => void
  onNewSession: () => void
  className?: string
}) {
  const [transcriptOpen, setTranscriptOpen] = useState(false)
  const [recordTypeOpen, setRecordTypeOpen] = useState(false)
  const content: OrbVoiceAfterCallContent = buildOrbVoiceAfterCallContent(turns, voiceSummary)
  const needsEscalation = orbVoiceNeedsEscalationPrompt(transcriptText)

  return (
    <section
      className={`orb-voice-after-call w-full space-y-4 text-left ${className}`.trim()}
      data-orb-voice-after-call
      data-orb-voice-mode="after_call"
    >
      <div className="space-y-1" data-orb-voice-after-call-summary>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--orb-muted)]">Conversation summary</p>
        {content.summary ? (
          <p className="text-sm leading-6 text-[var(--orb-foreground)]">{content.summary}</p>
        ) : (
          <p className="text-sm text-[var(--orb-muted)]">
            No transcript was captured. You can start a new voice session or type instead.
          </p>
        )}
      </div>

      {needsEscalation ? (
        <p
          className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-[11px] leading-5 text-amber-900 dark:text-amber-100"
          data-orb-voice-escalation-prompt
        >
          If there is immediate risk, follow your local safeguarding and emergency procedures. ORB supports
          reflection and recording but does not replace management oversight.
        </p>
      ) : null}

      <div data-orb-voice-recording-hints>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--orb-muted)]">
          What may need recording
        </p>
        {content.recordingHints.length ? (
          <ul className="mt-2 space-y-1.5 text-sm leading-6 text-[var(--orb-foreground)]">
            {content.recordingHints.map((hint) => (
              <li key={hint} className="rounded-lg bg-[var(--orb-primary-soft)]/25 px-3 py-2">
                {hint}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-sm text-[var(--orb-muted)]">
            Review what you discussed and choose a record type if anything should be documented.
          </p>
        )}
      </div>

      <div data-orb-voice-follow-up-questions>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--orb-muted)]">
          Possible follow-up questions
        </p>
        {content.followUpQuestions.length ? (
          <ul className="mt-2 space-y-1 text-xs leading-5 text-[var(--orb-muted)]">
            {content.followUpQuestions.map((q) => (
              <li key={q}>• {q}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-sm text-[var(--orb-muted)]">Start a conversation to see reflection prompts.</p>
        )}
      </div>

      <div className="space-y-2" data-orb-voice-after-call-actions>
        <button
          type="button"
          className="flex w-full items-center justify-between rounded-full border border-[var(--orb-line)]/60 px-4 py-2.5 text-sm text-[var(--orb-foreground)]"
          data-orb-voice-turn-into-record
          aria-expanded={recordTypeOpen}
          onClick={() => setRecordTypeOpen((v) => !v)}
        >
          <span>Turn speech into a record</span>
          <ChevronDown className={`h-4 w-4 transition ${recordTypeOpen ? 'rotate-180' : ''}`} aria-hidden />
        </button>
        {recordTypeOpen ? (
          <div className="space-y-2 rounded-xl border border-[var(--orb-line)]/40 bg-[var(--orb-surface-elevated)]/60 p-3" data-orb-voice-record-type-picker>
            <OrbDictateTemplateSelector
              selectedTemplateId={selectedTemplateId}
              onTemplateChange={onTemplateChange}
              variant="compact"
              appearance="capture"
            />
            <button
              type="button"
              className="w-full rounded-full bg-gradient-to-r from-[var(--orb-primary-blue,#168bff)] to-[var(--orb-primary-blue-2,#0d5fcc)] py-2.5 text-sm font-semibold text-white"
              data-orb-voice-create-draft-record
              onClick={() => onCreateDraftRecord(selectedTemplateId)}
            >
              Create draft record
            </button>
          </div>
        ) : null}

        {onSendToWrite ? (
          <button
            type="button"
            className="w-full rounded-full border border-[var(--orb-primary)]/40 bg-[var(--orb-primary-soft)]/40 py-2.5 text-sm font-medium text-[var(--orb-primary)]"
            data-orb-voice-send-to-write
            onClick={onSendToWrite}
          >
            Send to ORB Write
          </button>
        ) : null}

        <button
          type="button"
          className="w-full rounded-full border border-[var(--orb-line)] py-2.5 text-sm text-[var(--orb-muted)]"
          data-orb-voice-continue-talking
          onClick={onContinueTalking}
        >
          Continue talking
        </button>

        <button
          type="button"
          className="w-full rounded-full border border-[var(--orb-line)] py-2.5 text-sm text-[var(--orb-muted)]"
          data-orb-voice-copy-transcript
          onClick={onCopyTranscript}
          disabled={!transcriptText.trim()}
        >
          Copy transcript
        </button>

        <button
          type="button"
          className="w-full rounded-full bg-gradient-to-r from-[var(--orb-primary-blue,#168bff)] to-[var(--orb-primary-blue-2,#0d5fcc)] py-3 text-sm font-semibold text-white"
          data-orb-voice-new-session
          onClick={onNewSession}
        >
          New voice session
        </button>
      </div>

      {transcriptText.trim() ? (
        <details
          className="rounded-xl border border-[var(--orb-line)]/30"
          open={transcriptOpen}
          onToggle={(e) => setTranscriptOpen((e.target as HTMLDetailsElement).open)}
          data-orb-voice-transcript-drawer
        >
          <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-[var(--orb-muted)]">
            Full transcript
          </summary>
          <div className="max-h-[min(32dvh,16rem)] overflow-y-auto border-t border-[var(--orb-line)]/30 px-3 py-2">
            <p className="whitespace-pre-wrap text-xs leading-5 text-[var(--orb-foreground)]">{transcriptText}</p>
          </div>
        </details>
      ) : null}

      <p className="text-[10px] leading-4 text-[var(--orb-muted)]" data-orb-voice-after-call-boundary>
        Adult review required before saving or sharing. ORB helps structure and prompts reflection — it does not
        make safeguarding decisions.
      </p>
    </section>
  )
}
