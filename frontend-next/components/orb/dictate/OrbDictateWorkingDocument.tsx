'use client'

import {
  ORB_DICTATE_WORKING_DOC_LABEL,
  ORB_DICTATE_WORKING_DOC_SUPPORTING,
  ORB_DICTATE_WORKING_DOC_TITLE
} from '@/lib/orb/dictate/orb-dictate-capture-copy'
import {
  parseWorkingDocument,
  serializeWorkingDocument,
  type OrbDictateWorkingDocumentSection
} from '@/lib/orb/dictate/orb-dictate-working-document'

export type OrbDictateWorkingDocumentProps = {
  documentMarkdown: string
  onDocumentChange: (markdown: string) => void
  templateLabel: string
  readOnly?: boolean
}

function applySectionUpdate(
  sections: OrbDictateWorkingDocumentSection[],
  heading: string,
  body: string
): string {
  const next = sections.map((s) => (s.heading === heading ? { ...s, body } : s))
  return serializeWorkingDocument(next)
}

export function OrbDictateWorkingDocument({
  documentMarkdown,
  onDocumentChange,
  templateLabel,
  readOnly = false
}: OrbDictateWorkingDocumentProps) {
  const sections = parseWorkingDocument(documentMarkdown)

  return (
    <section
      className="orb-dictate-working-document rounded-2xl border border-[var(--orb-line)]/20 bg-white p-4 shadow-sm"
      data-orb-dictate-working-document
    >
      <header className="border-b border-[var(--orb-line)]/10 pb-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h4 className="text-sm font-semibold text-[var(--orb-foreground)]" data-orb-dictate-working-document-title>
              {ORB_DICTATE_WORKING_DOC_TITLE}
            </h4>
            <p className="mt-0.5 text-[11px] font-medium text-[var(--orb-primary)]" data-orb-dictate-working-document-label>
              {ORB_DICTATE_WORKING_DOC_LABEL}
            </p>
          </div>
          <span
            className="rounded-full bg-[var(--orb-surface)] px-2.5 py-0.5 text-[10px] font-medium text-[var(--orb-muted)]"
            data-orb-dictate-working-document-type
          >
            {templateLabel}
          </span>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-[var(--orb-muted)]" data-orb-dictate-working-document-supporting>
          {ORB_DICTATE_WORKING_DOC_SUPPORTING}
        </p>
      </header>

      <div className="orb-dictate-working-document-sections mt-4 space-y-4">
        {sections.length === 0 ? (
          <textarea
            value={documentMarkdown}
            onChange={(e) => onDocumentChange(e.target.value)}
            readOnly={readOnly}
            rows={10}
            className="w-full resize-y rounded-lg border border-[var(--orb-line)]/15 bg-[var(--orb-surface)]/30 px-3 py-2.5 text-sm leading-relaxed outline-none focus:border-[var(--orb-primary)]/35"
            data-orb-dictate-working-document-body
            aria-label="ORB working document"
          />
        ) : (
          sections.map((section) => (
            <div
              key={section.heading}
              className="orb-dictate-working-document-section"
              data-orb-dictate-working-document-section={section.heading}
            >
              <h5
                className="text-xs font-semibold tracking-wide text-[var(--orb-foreground)]"
                data-orb-dictate-working-document-heading={section.heading}
              >
                {section.heading}
              </h5>
              <textarea
                value={section.body}
                onChange={(e) => onDocumentChange(applySectionUpdate(sections, section.heading, e.target.value))}
                readOnly={readOnly}
                rows={Math.max(2, Math.min(6, section.body.split('\n').length + 1))}
                className="mt-1.5 w-full resize-y rounded-lg border border-[var(--orb-line)]/12 bg-[var(--orb-surface)]/25 px-3 py-2 text-sm leading-relaxed text-[var(--orb-foreground)] outline-none focus:border-[var(--orb-primary)]/30 focus:ring-1 focus:ring-[var(--orb-primary)]/10"
                data-orb-dictate-working-document-section-body={section.heading}
                aria-label={section.heading}
              />
            </div>
          ))
        )}
      </div>
    </section>
  )
}
