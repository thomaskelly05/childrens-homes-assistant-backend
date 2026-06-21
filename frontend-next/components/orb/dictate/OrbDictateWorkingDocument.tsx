'use client'

import {
  ORB_DICTATE_WORKING_DOC_LABEL,
  ORB_DICTATE_WORKING_DOC_SUPPORTING,
  ORB_DICTATE_WORKING_DOC_TITLE,
  orbDictateContentSourceLabel,
  type OrbDictateContentSource
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
  contentSource?: OrbDictateContentSource
  readOnly?: boolean
  prominent?: boolean
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
  contentSource,
  readOnly = false,
  prominent = false
}: OrbDictateWorkingDocumentProps) {
  const sections = parseWorkingDocument(documentMarkdown)

  return (
    <section
      className={`orb-dictate-working-document rounded-2xl border bg-white shadow-sm ${
        prominent
          ? 'border-[var(--orb-line)]/10 p-5 shadow-md ring-1 ring-[var(--orb-line)]/8'
          : 'border-[var(--orb-line)]/20 p-4'
      }`}
      data-orb-dictate-working-document
      data-orb-dictate-working-document-prominent={prominent ? 'true' : undefined}
    >
      <header className={`border-b border-[var(--orb-line)]/10 ${prominent ? 'pb-4' : 'pb-3'}`}>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h4
              className={`font-semibold text-[var(--orb-foreground)] ${prominent ? 'text-base' : 'text-sm'}`}
              data-orb-dictate-working-document-title
            >
              {templateLabel}
            </h4>
            <p className="mt-1 text-[11px] font-medium text-[var(--orb-primary)]" data-orb-dictate-working-document-label>
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
        {contentSource ? (
          <p className="mt-2 text-[11px] text-[var(--orb-muted)]" data-orb-dictate-working-document-source={contentSource}>
            {orbDictateContentSourceLabel(contentSource)}
          </p>
        ) : null}
      </header>

      <div className={`orb-dictate-working-document-sections space-y-4 ${prominent ? 'mt-5' : 'mt-4'}`}>
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
                className={`mt-1.5 w-full resize-y rounded-lg border px-3 py-2.5 text-sm leading-relaxed text-[var(--orb-foreground)] outline-none focus:border-[var(--orb-primary)]/30 focus:ring-1 focus:ring-[var(--orb-primary)]/10 ${
                  prominent
                    ? 'min-h-[4.5rem] border-[var(--orb-line)]/10 bg-white'
                    : 'border-[var(--orb-line)]/12 bg-[var(--orb-surface)]/25'
                }`}
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
