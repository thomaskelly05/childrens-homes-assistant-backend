'use client'

import { Copy, FileEdit, FileText } from 'lucide-react'

import {
  ORB_DICTATE_ACTION_COPY,
  ORB_DICTATE_ACTION_OPEN_WRITE,
  ORB_DICTATE_ACTION_SAVE,
  ORB_DICTATE_DRAFT_REVIEW_LABEL,
  ORB_DICTATE_SAFER_DRAFT_TITLE,
  dictateDraftSectionsForTemplate
} from '@/lib/orb/dictate/orb-dictate-capture-copy'
import type { OrbDictateRecordingMedia } from '@/lib/orb/dictate/orb-dictate-recording-media'
import { OrbDictateRecordingAttachment } from '@/components/orb/dictate/OrbDictateRecordingAttachment'
import type { OrbDictateGenerateResult } from '@/lib/orb/dictate/orb-dictate-types'

export function OrbDictateSaferDraftPanel({
  output,
  draftText,
  templateId,
  recordingMedia,
  onCopy,
  onSave,
  onOpenInWrite,
  saving,
  copying
}: {
  output: OrbDictateGenerateResult
  draftText: string
  templateId: string
  recordingMedia?: OrbDictateRecordingMedia | null
  onCopy: () => void
  onSave: () => void
  onOpenInWrite: () => void
  saving?: boolean
  copying?: boolean
}) {
  const sections = dictateDraftSectionsForTemplate(templateId)

  return (
    <section
      className="orb-dictate-safer-draft rounded-2xl border border-[var(--orb-line)]/20 bg-[var(--orb-surface)]/70 p-4"
      data-orb-dictate-safer-draft
      data-orb-dictate-safer-draft-stage
    >
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-[var(--orb-foreground)]" data-orb-dictate-safer-draft-title>
            {ORB_DICTATE_SAFER_DRAFT_TITLE}
          </h3>
          <p
            className="mt-0.5 text-[11px] font-medium text-[var(--orb-primary)]"
            data-orb-dictate-draft-review-label
          >
            {ORB_DICTATE_DRAFT_REVIEW_LABEL}
          </p>
        </div>
        <span className="rounded-full border border-[var(--orb-line)]/30 px-2 py-0.5 text-[10px] text-[var(--orb-muted)]">
          {output.title}
        </span>
      </header>

      <div className="mt-3 rounded-xl border border-[var(--orb-line)]/15 bg-white/90 p-3" data-orb-dictate-draft-structure>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--orb-muted)]">Draft structure</p>
        <ul className="mt-1.5 flex flex-wrap gap-1.5">
          {sections.map((section) => (
            <li
              key={section}
              className="rounded-full bg-[var(--orb-surface)] px-2 py-0.5 text-[10px] text-[var(--orb-muted)]"
              data-orb-dictate-draft-section={section}
            >
              {section}
            </li>
          ))}
        </ul>
      </div>

      <div
        className="orb-dictate-draft-body mt-3 max-h-[min(40vh,24rem)] overflow-y-auto rounded-xl border border-[var(--orb-line)]/15 bg-white/95 p-4 text-sm leading-relaxed text-[var(--orb-foreground)]"
        data-orb-dictate-draft-body
      >
        <pre className="whitespace-pre-wrap font-sans">{draftText || output.professional_note}</pre>
      </div>

      {recordingMedia ? (
        <div className="mt-3" data-orb-dictate-safer-draft-recording>
          <OrbDictateRecordingAttachment media={recordingMedia} />
        </div>
      ) : null}

      <div
        className="orb-dictate-output-actions mt-4 flex flex-wrap items-center gap-2"
        data-orb-dictate-output-actions
      >
        <button
          type="button"
          data-orb-dictate-open-write
          className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--orb-primary)] px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:brightness-105"
          onClick={onOpenInWrite}
        >
          <FileEdit className="h-3.5 w-3.5" aria-hidden />
          {ORB_DICTATE_ACTION_OPEN_WRITE}
        </button>
        <button
          type="button"
          data-orb-dictate-copy
          disabled={copying}
          className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--orb-line)]/40 bg-white px-3 py-2 text-xs font-medium text-[var(--orb-foreground)] disabled:opacity-50"
          onClick={onCopy}
        >
          <Copy className="h-3.5 w-3.5" aria-hidden />
          {ORB_DICTATE_ACTION_COPY}
        </button>
        <button
          type="button"
          data-orb-dictate-save
          disabled={saving}
          className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--orb-line)]/40 bg-white px-3 py-2 text-xs font-medium text-[var(--orb-foreground)] disabled:opacity-50"
          onClick={onSave}
        >
          <FileText className="h-3.5 w-3.5" aria-hidden />
          {ORB_DICTATE_ACTION_SAVE}
        </button>
      </div>
    </section>
  )
}
