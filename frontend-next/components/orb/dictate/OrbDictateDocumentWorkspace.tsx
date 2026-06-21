'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

import { OrbDictateEditAssistant } from '@/components/orb/dictate/OrbDictateEditAssistant'
import { OrbDictatePeopleConfirm } from '@/components/orb/dictate/OrbDictatePeopleConfirm'
import { OrbDictateRecordingAttachment } from '@/components/orb/dictate/OrbDictateRecordingAttachment'
import { OrbDictateWorkingDocument } from '@/components/orb/dictate/OrbDictateWorkingDocument'
import { OrbDictateWriteTemplateSelector } from '@/components/orb/dictate/OrbDictateWriteTemplateSelector'
import {
  ORB_DICTATE_ACTION_COPY,
  ORB_DICTATE_ACTION_OPEN_WRITE,
  ORB_DICTATE_ACTION_SAVE,
  ORB_DICTATE_CAPTURE_AGAIN,
  ORB_DICTATE_DOCUMENT_WORKSPACE_TITLE,
  ORB_DICTATE_REVIEW_WITH_ORB,
  ORB_DICTATE_SOURCE_TRANSCRIPT_LABEL,
  ORB_DICTATE_SOURCE_TRANSCRIPT_TOGGLE,
  ORB_DICTATE_SPEECH_QUALITY_NOTE,
  type OrbDictateContentSource
} from '@/lib/orb/dictate/orb-dictate-capture-copy'
import type { OrbDictatePersonConfirmItem } from '@/lib/orb/dictate/orb-dictate-people-identification'
import type { OrbDictateRecordingMedia } from '@/lib/orb/dictate/orb-dictate-recording-media'

export type OrbDictateDocumentWorkspaceProps = {
  transcript: string
  onTranscriptChange: (value: string) => void
  workingDocument: string
  onWorkingDocumentChange: (value: string) => void
  templateLabel: string
  captureSource: 'speak' | 'paste' | 'upload'
  selectedTemplateId: string
  onSelectTemplate: (templateId: string) => void
  orbInstruction: string
  onOrbInstructionChange: (value: string) => void
  onApplyOrbChange: () => void
  onReviewWithOrb: () => void
  onCaptureAgain: () => void
  onCopy?: () => void
  onSave?: () => void
  onOpenInWrite?: () => void
  applyingEdit: boolean
  editNote: string | null
  applyStatus: string | null
  interactive: boolean
  recordingMedia?: OrbDictateRecordingMedia | null
  contentSource?: OrbDictateContentSource
  peopleToConfirm?: OrbDictatePersonConfirmItem[]
  onPeopleToConfirmChange?: (items: OrbDictatePersonConfirmItem[]) => void
}

export function OrbDictateDocumentWorkspace(props: OrbDictateDocumentWorkspaceProps) {
  const [transcriptOpen, setTranscriptOpen] = useState(false)
  const hasTranscript = props.transcript.trim().length > 0
  const hasWorkingDoc = props.workingDocument.trim().length > 0
  const canAct = hasTranscript || hasWorkingDoc

  return (
    <section
      className="orb-dictate-document-workspace orb-dictate-orb-write-converged rounded-2xl border border-[var(--orb-line)]/15 bg-[var(--orb-surface)]/40 p-3 shadow-sm sm:p-4"
      data-orb-dictate-document-workspace
      data-orb-dictate-transcript-workspace
      data-orb-dictate-orb-write-converged
      data-orb-dictate-sidebar-safe="true"
      data-orb-dictate-document-quality
    >
      <header className="mb-3">
        <h3 className="text-base font-semibold text-[var(--orb-foreground)]" data-orb-dictate-document-workspace-title>
          {ORB_DICTATE_DOCUMENT_WORKSPACE_TITLE}
        </h3>
      </header>

      {props.peopleToConfirm?.length ? (
        <div className="mb-4" data-orb-dictate-people-confirm-top>
          <OrbDictatePeopleConfirm
            items={props.peopleToConfirm}
            prominent
            interactive={props.interactive}
            onItemsChange={props.onPeopleToConfirmChange}
          />
        </div>
      ) : null}

      <div className="orb-dictate-document-workspace-grid grid gap-4 lg:grid-cols-[minmax(0,7fr)_minmax(0,3fr)]">
        <div className="orb-dictate-document-main min-w-0 space-y-3">
          <OrbDictateWorkingDocument
            documentMarkdown={props.workingDocument}
            onDocumentChange={props.onWorkingDocumentChange}
            templateLabel={props.templateLabel}
            contentSource={props.contentSource}
            readOnly={!props.interactive}
            prominent
          />

          {props.recordingMedia ? <OrbDictateRecordingAttachment media={props.recordingMedia} /> : null}

          <p className="text-xs leading-relaxed text-[var(--orb-muted)]" data-orb-dictate-speech-quality-note>
            {ORB_DICTATE_SPEECH_QUALITY_NOTE}
          </p>

          <details
            className="orb-dictate-source-transcript rounded-xl border border-[var(--orb-line)]/12 bg-white/70"
            open={transcriptOpen}
            data-orb-dictate-source-transcript
          >
            <summary
              className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 text-sm font-medium text-[var(--orb-foreground)]"
              onClick={(e) => {
                e.preventDefault()
                setTranscriptOpen((open) => !open)
              }}
            >
              <span data-orb-dictate-source-transcript-toggle>
                {transcriptOpen ? ORB_DICTATE_SOURCE_TRANSCRIPT_LABEL : ORB_DICTATE_SOURCE_TRANSCRIPT_TOGGLE}
              </span>
              {transcriptOpen ? <ChevronUp className="h-4 w-4" aria-hidden /> : <ChevronDown className="h-4 w-4" aria-hidden />}
            </summary>
            <div className="border-t border-[var(--orb-line)]/10 p-3">
              <textarea
                value={props.transcript}
                onChange={(e) => props.onTranscriptChange(e.target.value)}
                rows={6}
                className="orb-dictate-original-transcript w-full resize-y rounded-lg border border-[var(--orb-line)]/15 bg-[var(--orb-surface)]/20 px-3 py-2.5 text-sm leading-relaxed outline-none focus:border-[var(--orb-primary)]/30"
                aria-label={ORB_DICTATE_SOURCE_TRANSCRIPT_LABEL}
                data-orb-dictate-original-transcript
              />
            </div>
          </details>
        </div>

        <aside className="orb-dictate-assistant-rail flex min-w-0 flex-col gap-3" data-orb-dictate-assistant-rail>
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
            compact
          />
        </aside>
      </div>

      {props.interactive ? (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-[var(--orb-line)]/10 pt-4" data-orb-dictate-document-workspace-actions>
          <button
            type="button"
            data-orb-dictate-review-with-orb
            disabled={!canAct}
            className="orb-dictate-primary-action inline-flex items-center gap-1.5 rounded-xl bg-[var(--orb-primary)] px-4 py-2 text-xs font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-40"
            onClick={props.onReviewWithOrb}
          >
            {ORB_DICTATE_REVIEW_WITH_ORB}
          </button>
          {props.onOpenInWrite ? (
            <button
              type="button"
              data-orb-dictate-open-write
              disabled={!hasWorkingDoc}
              className="orb-dictate-secondary-action inline-flex items-center gap-1.5 rounded-xl border border-[var(--orb-primary)]/35 bg-[var(--orb-primary-soft)] px-4 py-2 text-xs font-semibold text-[var(--orb-foreground)] disabled:opacity-55"
              onClick={props.onOpenInWrite}
            >
              {ORB_DICTATE_ACTION_OPEN_WRITE}
            </button>
          ) : null}
          {props.onCopy ? (
            <button
              type="button"
              data-orb-dictate-copy
              disabled={!hasWorkingDoc}
              className="orb-dictate-secondary-action inline-flex items-center gap-1.5 rounded-xl border border-[var(--orb-line)]/35 bg-white px-4 py-2 text-xs font-semibold text-[var(--orb-foreground)] disabled:opacity-55"
              onClick={props.onCopy}
            >
              {ORB_DICTATE_ACTION_COPY}
            </button>
          ) : null}
          {props.onSave ? (
            <button
              type="button"
              data-orb-dictate-save-draft
              disabled={!hasWorkingDoc}
              className="orb-dictate-secondary-action inline-flex items-center gap-1.5 rounded-xl border border-[var(--orb-line)]/35 bg-white px-4 py-2 text-xs font-semibold text-[var(--orb-foreground)] disabled:opacity-55"
              onClick={props.onSave}
            >
              {ORB_DICTATE_ACTION_SAVE}
            </button>
          ) : null}
          <button
            type="button"
            data-orb-dictate-capture-again
            className="orb-dictate-secondary-action inline-flex items-center gap-1.5 rounded-xl border border-[var(--orb-line)]/35 bg-white px-4 py-2 text-xs font-semibold text-[var(--orb-foreground)]"
            onClick={props.onCaptureAgain}
          >
            {ORB_DICTATE_CAPTURE_AGAIN}
          </button>
        </div>
      ) : null}
    </section>
  )
}
