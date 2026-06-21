'use client'

import { useMemo, useState } from 'react'

import {
  ORB_DICTATE_WORKING_DOC_LABEL,
  ORB_DICTATE_WORKING_DOC_SUPPORTING,
  orbDictateContentSourceLabel,
  type OrbDictateContentSource
} from '@/lib/orb/dictate/orb-dictate-capture-copy'
import {
  isOrbDictateSectionPlaceholder,
  parseWorkingDocument,
  serializeWorkingDocument,
  type OrbDictateWorkingDocumentSection
} from '@/lib/orb/dictate/orb-dictate-working-document'

function SectionSourceEvidence({ section }: { section: OrbDictateWorkingDocumentSection }) {
  const [open, setOpen] = useState(false)
  const isMissing = section.sourceType === 'missing_guidance' || isOrbDictateSectionPlaceholder(section.body)
  if (isMissing) {
    return (
      <p className="mt-1 text-[11px] text-slate-500" data-orb-dictate-section-source-missing>
        Not captured in transcript
      </p>
    )
  }
  if (!section.sourceSnippets?.length && section.sourceType !== 'transcript') return null
  return (
    <details
      className="mt-1"
      open={open}
      onToggle={(event) => setOpen((event.target as HTMLDetailsElement).open)}
      data-orb-dictate-section-source
    >
      <summary className="cursor-pointer text-[11px] font-medium text-sky-800 hover:underline">
        View source
      </summary>
      <div className="mt-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-[11px] leading-relaxed text-slate-600">
        <p className="font-medium text-slate-700">
          {section.sourceType === 'adult_instruction' ? 'Based on adult instruction' : 'Based on captured transcript'}
        </p>
        {section.sourceSnippets?.map((snippet) => (
          <p key={snippet} className="mt-1 whitespace-pre-wrap">
            {snippet}
          </p>
        ))}
      </div>
    </details>
  )
}

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

function paragraphRows(body: string): number {
  const lines = body.split('\n').length
  const wrapped = Math.ceil(body.length / 88)
  return Math.max(2, Math.min(10, Math.max(lines, wrapped)))
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
  const [editingHeading, setEditingHeading] = useState<string | null>(null)
  const [documentTitle, setDocumentTitle] = useState(templateLabel)
  const dateLine = useMemo(
    () =>
      new Date().toLocaleString('en-GB', {
        dateStyle: 'medium',
        timeStyle: 'short'
      }),
    []
  )

  const sectionEditor = (
    <div
      className={`orb-dictate-working-document-sections space-y-6 ${prominent ? 'mt-2' : 'mt-4'}`}
      data-orb-dictate-document-blocks
    >
      {sections.length === 0 ? (
        <div className="orb-dictate-write-paragraph-block">
          <textarea
            value={documentMarkdown}
            onChange={(e) => onDocumentChange(e.target.value)}
            readOnly={readOnly}
            rows={8}
            className="orb-dictate-write-section-body w-full resize-y bg-transparent text-[15px] leading-[1.65] text-slate-800 outline-none"
            data-orb-dictate-working-document-body
            aria-label="ORB working document"
          />
        </div>
      ) : (
        sections.map((section) => {
          const isGuidance = isOrbDictateSectionPlaceholder(section.body)
          const isEditing = editingHeading === section.heading
          return (
            <div
              key={section.heading}
              className="orb-dictate-working-document-section orb-dictate-write-section-block"
              data-orb-dictate-working-document-section={section.heading}
            >
              <h2
                className="text-[13px] font-semibold uppercase tracking-[0.08em] text-slate-600"
                data-orb-dictate-working-document-heading={section.heading}
              >
                {section.heading}
              </h2>
              <div
                className={`orb-dictate-write-paragraph-block mt-2 ${
                  isGuidance ? 'orb-dictate-write-paragraph-block--guidance' : ''
                } ${isEditing ? 'orb-dictate-write-paragraph-block--editing' : ''}`}
                data-orb-dictate-write-paragraph-block
              >
                <textarea
                  value={section.body}
                  onChange={(e) => onDocumentChange(applySectionUpdate(sections, section.heading, e.target.value))}
                  onFocus={() => setEditingHeading(section.heading)}
                  onBlur={() => setEditingHeading((current) => (current === section.heading ? null : current))}
                  readOnly={readOnly}
                  rows={paragraphRows(section.body)}
                  className="orb-dictate-write-section-body w-full resize-none border-0 bg-transparent px-0 py-0 text-[15px] leading-[1.65] text-slate-800 outline-none focus:ring-0"
                  data-orb-dictate-working-document-section-body={section.heading}
                  data-orb-dictate-section-placeholder={isGuidance ? 'true' : undefined}
                  aria-label={section.heading}
                />
              </div>
              <SectionSourceEvidence section={section} />
            </div>
          )
        })
      )}
    </div>
  )

  if (!prominent) {
    return (
      <section
        className="orb-dictate-working-document rounded-2xl border border-[var(--orb-line)]/20 bg-white p-4 shadow-sm"
        data-orb-dictate-working-document
      >
        <header className="border-b border-[var(--orb-line)]/10 pb-3">
          <h4 className="text-sm font-semibold text-[var(--orb-foreground)]" data-orb-dictate-working-document-title>
            {templateLabel}
          </h4>
          <p className="mt-1 text-[11px] font-medium text-[var(--orb-primary)]" data-orb-dictate-working-document-label>
            {ORB_DICTATE_WORKING_DOC_LABEL}
          </p>
        </header>
        {sectionEditor}
      </section>
    )
  }

  return (
    <section
      className="orb-dictate-working-document orb-dictate-write-converged min-w-0"
      data-orb-dictate-working-document
      data-orb-dictate-working-document-prominent="true"
      data-orb-dictate-write-converged
      data-orb-dictate-document-quality
    >
      <div
        className="orb-dictate-write-canvas-workspace orb-studio-document-canvas-workspace min-h-[28rem] overflow-auto rounded-xl bg-[#e8eaed] p-4 md:p-5"
        data-orb-write-canvas-workspace
      >
        <div className="mx-auto w-full max-w-[210mm]" data-orb-write-document-canvas>
          <article
            className="min-h-[280mm] bg-white px-[16mm] py-[14mm] text-[#0f172a] shadow-[0_4px_24px_rgba(15,23,42,0.12)]"
            data-orb-write-print-page
          >
            <header className="mb-6 border-b border-slate-200 pb-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                {readOnly ? (
                  <h1 className="text-xl font-semibold text-slate-900" data-orb-write-page-title data-orb-dictate-working-document-title>
                    {documentTitle}
                  </h1>
                ) : (
                  <input
                    type="text"
                    value={documentTitle}
                    onChange={(e) => setDocumentTitle(e.target.value)}
                    className="orb-dictate-document-title-input w-full min-w-0 border-0 bg-transparent text-xl font-semibold text-slate-900 outline-none focus:ring-0"
                    data-orb-write-page-title
                    data-orb-dictate-working-document-title
                    aria-label="Document title"
                  />
                )}
                <span
                  className="inline-flex shrink-0 items-center rounded-full border border-slate-300 bg-slate-100 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-800"
                  data-orb-write-review-badge
                  data-orb-dictate-working-document-label
                >
                  {ORB_DICTATE_WORKING_DOC_LABEL}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                <span
                  className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 font-medium text-sky-900"
                  data-orb-write-record-type-badge
                  data-orb-dictate-working-document-type
                >
                  {templateLabel}
                </span>
                <time dateTime={new Date().toISOString()} data-orb-write-datetime>
                  {dateLine}
                </time>
              </div>
              {contentSource ? (
                <p className="mt-2 text-xs text-slate-500" data-orb-dictate-working-document-source={contentSource}>
                  {orbDictateContentSourceLabel(contentSource)}
                </p>
              ) : null}
              <p className="mt-2 text-xs leading-relaxed text-slate-500">{ORB_DICTATE_WORKING_DOC_SUPPORTING}</p>
            </header>
            {sectionEditor}
          </article>
        </div>
      </div>
    </section>
  )
}
