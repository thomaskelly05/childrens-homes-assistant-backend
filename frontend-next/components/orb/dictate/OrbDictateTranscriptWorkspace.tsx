'use client'

import { OrbDictateEditAssistant } from '@/components/orb/dictate/OrbDictateEditAssistant'
import { OrbDictateRecordingAttachment } from '@/components/orb/dictate/OrbDictateRecordingAttachment'
import { OrbDictateWorkingDocument } from '@/components/orb/dictate/OrbDictateWorkingDocument'
import { OrbDictateWriteTemplateSelector } from '@/components/orb/dictate/OrbDictateWriteTemplateSelector'
import {
  ORB_DICTATE_CAPTURE_AGAIN,
  ORB_DICTATE_ORIGINAL_NOTES_LABEL,
  ORB_DICTATE_ORIGINAL_TRANSCRIPT_LABEL,
  ORB_DICTATE_REVIEW_WITH_ORB,
  ORB_DICTATE_TRANSCRIPT_WORKSPACE_SUPPORTING,
  ORB_DICTATE_TRANSCRIPT_WORKSPACE_TITLE,
  type OrbDictateContentSource
} from '@/lib/orb/dictate/orb-dictate-capture-copy'
import type { OrbDictateRecordingMedia } from '@/lib/orb/dictate/orb-dictate-recording-media'

export type OrbDictateCaptureSource = 'speak' | 'paste' | 'upload'

export type OrbDictateTranscriptWorkspaceProps = {
  transcript: string
  onTranscriptChange: (value: string) => void
  workingDocument: string
  onWorkingDocumentChange: (value: string) => void
  templateLabel: string
  captureSource: OrbDictateCaptureSource
  selectedTemplateId: string
  onSelectTemplate: (templateId: string) => void
  orbInstruction: string
  onOrbInstructionChange: (value: string) => void
  onApplyOrbChange: () => void
  onReviewWithOrb: () => void
  onCaptureAgain: () => void
  applyingEdit: boolean
  editNote: string | null
  applyStatus: string | null
  interactive: boolean
  recordingMedia?: OrbDictateRecordingMedia | null
  contentSource?: OrbDictateContentSource
}

export function OrbDictateTranscriptWorkspace(props: OrbDictateTranscriptWorkspaceProps) {
  const hasTranscript = props.transcript.trim().length > 0
  const hasWorkingDoc = props.workingDocument.trim().length > 0
  const canAct = hasTranscript || hasWorkingDoc
  const originalLabel =
    props.captureSource === 'paste' ? ORB_DICTATE_ORIGINAL_NOTES_LABEL : ORB_DICTATE_ORIGINAL_TRANSCRIPT_LABEL

  return (
    <section
      className="orb-dictate-transcript-workspace rounded-2xl border border-[var(--orb-line)]/15 bg-[var(--orb-surface)]/80 p-4 shadow-sm"
      data-orb-dictate-transcript-workspace
      data-orb-dictate-rough-capture-stage
    >
      <header>
        <h3 className="text-sm font-semibold text-[var(--orb-foreground)]" data-orb-dictate-transcript-workspace-title>
          {ORB_DICTATE_TRANSCRIPT_WORKSPACE_TITLE}
        </h3>
        <p className="mt-1 text-xs leading-relaxed text-[var(--orb-muted)]" data-orb-dictate-transcript-workspace-supporting>
          {ORB_DICTATE_TRANSCRIPT_WORKSPACE_SUPPORTING}
        </p>
      </header>

      <div className="orb-dictate-transcript-workspace-grid mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="orb-dictate-original-transcript-panel min-w-0">
          <p
            className="text-[11px] font-medium text-[var(--orb-primary)]"
            data-orb-dictate-original-label={props.captureSource === 'paste' ? 'notes' : 'transcript'}
          >
            {originalLabel}
          </p>
          <textarea
            value={props.transcript}
            onChange={(e) => props.onTranscriptChange(e.target.value)}
            rows={8}
            className="orb-dictate-original-transcript mt-2 w-full resize-y rounded-xl border border-[var(--orb-line)]/20 bg-white/95 px-3 py-3 text-sm leading-relaxed text-[var(--orb-foreground)] outline-none focus:border-[var(--orb-primary)]/35 focus:ring-2 focus:ring-[var(--orb-primary)]/10"
            aria-label={originalLabel}
            data-orb-dictate-original-transcript
            data-orb-dictate-rough-capture-text
          />
          {props.recordingMedia ? (
            <div className="mt-3">
              <OrbDictateRecordingAttachment media={props.recordingMedia} />
            </div>
          ) : null}
        </div>

        <div className="orb-dictate-transcript-workspace-side flex min-w-0 flex-col gap-3">
          <OrbDictateEditAssistant
            instruction={props.orbInstruction}
            onInstructionChange={props.onOrbInstructionChange}
            onApply={props.onApplyOrbChange}
            applying={props.applyingEdit}
            disabled={!props.interactive}
            canApply={props.interactive && canAct}
            editNote={props.editNote}
            applyStatus={props.applyStatus}
          />
          <OrbDictateWriteTemplateSelector
            selectedTemplateId={props.selectedTemplateId}
            onSelectTemplate={props.onSelectTemplate}
          />
        </div>
      </div>

      <div className="mt-4">
        <OrbDictateWorkingDocument
          documentMarkdown={props.workingDocument}
          onDocumentChange={props.onWorkingDocumentChange}
          templateLabel={props.templateLabel}
          contentSource={props.contentSource}
          readOnly={!props.interactive}
        />
      </div>

      {props.interactive ? (
        <div className="mt-4 flex flex-wrap gap-2" data-orb-dictate-transcript-workspace-actions>
          <button
            type="button"
            data-orb-dictate-review-with-orb
            disabled={!canAct}
            className="orb-dictate-primary-action inline-flex items-center gap-1.5 rounded-xl bg-[var(--orb-primary)] px-4 py-2 text-xs font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-40"
            onClick={props.onReviewWithOrb}
          >
            {ORB_DICTATE_REVIEW_WITH_ORB}
          </button>
          <button
            type="button"
            data-orb-dictate-capture-again
            className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--orb-line)]/30 bg-white/80 px-4 py-2 text-xs font-medium text-[var(--orb-muted)] hover:text-[var(--orb-foreground)]"
            onClick={props.onCaptureAgain}
          >
            {ORB_DICTATE_CAPTURE_AGAIN}
          </button>
        </div>
      ) : null}
    </section>
  )
}
