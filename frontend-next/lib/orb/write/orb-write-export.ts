import type { OrbWriteDocument } from '@/lib/orb/write/orb-write-types'
import { exportOrbDictateNote } from '@/lib/orb/dictate/orb-dictate-client'

const PDF_FOOTER = 'Generated with ORB Residential, powered by IndiCare Intelligence'

export function buildOrbWritePrintHtml(doc: OrbWriteDocument): string {
  const date = new Date(doc.updated_at).toLocaleString('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short'
  })
  const escapedBody = doc.body
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br/>')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <title>${escapeHtml(doc.title)}</title>
  <style>
    body { font-family: Georgia, 'Times New Roman', serif; max-width: 720px; margin: 2rem auto; color: #0f172a; line-height: 1.6; }
    h1 { font-size: 1.5rem; margin-bottom: 0.25rem; }
    .meta { font-size: 0.85rem; color: #64748b; margin-bottom: 1.5rem; }
    .review { font-size: 0.8rem; border-left: 3px solid #2563eb; padding-left: 0.75rem; margin: 1.5rem 0; color: #334155; }
    .footer { margin-top: 2rem; font-size: 0.75rem; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 0.75rem; }
    @media print { body { margin: 1cm; } }
  </style>
</head>
<body>
  <h1>${escapeHtml(doc.title)}</h1>
  <div class="meta">
    <div><strong>Record type:</strong> ${escapeHtml(doc.record_type_label)}</div>
    <div><strong>Date:</strong> ${escapeHtml(date)}</div>
  </div>
  <div class="body">${escapedBody}</div>
  <div class="review">${escapeHtml(doc.review_required_statement)}</div>
  <div class="footer">${PDF_FOOTER}</div>
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
    doc.body,
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
