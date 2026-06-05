import type { OrbWriteDocument } from '@/lib/orb/write/orb-write-types'
import { exportOrbDictateNote } from '@/lib/orb/dictate/orb-dictate-client'
import { resolveOrbRecordingRecordType } from '@/lib/orb/recording/orb-recording-framework'

const PDF_FOOTER = 'Generated with ORB Residential, powered by IndiCare Intelligence'

function formatBodyWithHeadings(doc: OrbWriteDocument): string {
  const recordType = resolveOrbRecordingRecordType({
    recordTypeId: doc.record_type_id,
    noteType: doc.record_type
  })
  const headings = doc.document_headings?.length ? doc.document_headings : recordType.pdf_heading_order
  let body = doc.body
  if (!/^##\s+/m.test(body) && headings.length) {
    body = headings.map((h) => `## ${h}\n\n`).join('') + '\n' + body
  }
  return body
}

function bodyToPrintHtml(body: string): string {
  if (body.includes('<')) return body
  return escapeHtml(body).replace(/\n/g, '<br/>')
}

export function buildOrbWritePrintHtml(doc: OrbWriteDocument): string {
  const date = new Date(doc.updated_at).toLocaleString('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short'
  })
  const formatted = doc.body.includes('<') ? doc.body : formatBodyWithHeadings(doc)
  const bodyContent = bodyToPrintHtml(formatted)

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <title>${escapeHtml(doc.title)}</title>
  <style>
    @page { size: A4; margin: 18mm 20mm; }
    body { font-family: Georgia, 'Times New Roman', serif; max-width: 210mm; margin: 0 auto; color: #0f172a; line-height: 1.6; background: #fff; }
    .page { min-height: 257mm; }
    h1 { font-size: 1.35rem; margin: 0 0 0.5rem; font-weight: 600; }
    .badge { display: inline-block; font-size: 0.75rem; border: 1px solid #bae6fd; background: #f0f9ff; color: #075985; border-radius: 999px; padding: 0.15rem 0.5rem; margin-right: 0.5rem; }
    .meta { font-size: 0.8rem; color: #64748b; margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: 1px solid #e2e8f0; }
    .body { font-size: 0.9rem; min-height: 180mm; }
  .body h1, .body h2 { font-size: 1rem; font-weight: 600; margin: 1rem 0 0.5rem; }
    .review { font-size: 0.8rem; margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #e2e8f0; color: #334155; }
    .footer { margin-top: 0.75rem; font-size: 0.7rem; color: #94a3b8; }
    @media print { body { margin: 0; } }
  </style>
</head>
<body>
  <article class="page">
    <h1>${escapeHtml(doc.title)}</h1>
    <div class="meta">
      <span class="badge">${escapeHtml(doc.record_type_label)}</span>
      <span>${escapeHtml(date)}</span>
    </div>
    <div class="body">${bodyContent}</div>
    <div class="review">${escapeHtml(doc.review_required_statement)}</div>
    <div class="footer">${PDF_FOOTER}</div>
  </article>
</body>
</html>`
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function printOrbWriteDocument(doc: OrbWriteDocument): void {
  const html = buildOrbWritePrintHtml(doc)
  const win = window.open('', '_blank', 'noopener,noreferrer')
  if (!win) {
    window.print()
    return
  }
  win.document.write(html)
  win.document.close()
  win.focus()
  win.print()
}

export async function exportOrbWritePdf(doc: OrbWriteDocument): Promise<void> {
  const printBody = [
    formatBodyWithHeadings(doc),
    '',
    '---',
    '',
    doc.review_required_statement,
    '',
    PDF_FOOTER
  ].join('\n')

  try {
    const blob = await exportOrbDictateNote({
      title: doc.title,
      professional_note: printBody,
      format: 'pdf',
      note_type: doc.record_type
    })
    if ('content' in blob) return
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${doc.title.replace(/[^a-z0-9-_]+/gi, '-')}.pdf`
    a.click()
    URL.revokeObjectURL(url)
  } catch {
    printOrbWriteDocument(doc)
  }
}

export function copyOrbWriteText(doc: OrbWriteDocument): string {
  return [
    doc.title,
    `Record type: ${doc.record_type_label}`,
    '',
    doc.body,
    '',
    doc.review_required_statement
  ].join('\n')
}
