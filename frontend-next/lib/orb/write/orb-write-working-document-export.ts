import type {
  OrbTemplateWorkingDocument,
  OrbTemplateWorkingDocumentSection
} from '@/lib/orb/template/orb-template-working-document-types'

export type OrbWriteWorkingDocumentCopyOptions = {
  includeSources?: boolean
  includeDraftReviewNote?: boolean
}

function formatTableMarkdown(
  table: OrbTemplateWorkingDocument['tables'][number]
): string {
  const lines: string[] = [table.title]
  if (table.guidance?.trim()) lines.push(`(${table.guidance.trim()})`)
  if (!table.columns.length) return lines.join('\n')
  lines.push('| ' + table.columns.join(' | ') + ' |')
  lines.push('| ' + table.columns.map(() => '---').join(' | ') + ' |')
  if (table.rows.length) {
    for (const row of table.rows) {
      lines.push('| ' + table.columns.map((col) => String(row[col] ?? '')).join(' | ') + ' |')
    }
  }
  return lines.join('\n')
}

function formatChartPlaceholder(chart: OrbTemplateWorkingDocument['charts'][number]): string {
  if (chart.has_data) return `${chart.title}\n[Chart: ${chart.chart_type}]`
  return `${chart.title}\n${chart.empty_state_guidance}`
}

/** Export-ready plain text — excludes UI guidance and source chips by default. */
export function copyWorkingDocumentText(
  document: OrbTemplateWorkingDocument,
  options: OrbWriteWorkingDocumentCopyOptions = {}
): string {
  const includeSources = options.includeSources ?? false
  const includeDraftNote = options.includeDraftReviewNote ?? document.status === 'draft'
  const parts: string[] = [document.title]

  if (includeDraftNote) {
    parts.push('', 'Draft — review before saving or sharing.')
  }

  for (const section of [...document.sections].sort((a, b) => a.sort_order - b.sort_order)) {
    if (!section.heading && !section.body.trim()) continue
    parts.push('')
    parts.push(section.heading)
    if (section.body.trim()) parts.push(section.body.trim())
  }

  for (const table of document.tables) {
    parts.push('')
    parts.push(formatTableMarkdown(table))
  }

  for (const chart of document.charts) {
    parts.push('')
    parts.push(formatChartPlaceholder(chart))
  }

  if (includeSources) {
    const chips = [...document.source_chips, ...document.home_document_chips]
    if (chips.length) {
      parts.push('')
      parts.push('Sources:')
      for (const chip of chips) parts.push(`- ${chip.label}`)
    }
  }

  return parts.join('\n').trim()
}

export function copyWorkingDocumentSectionText(section: OrbTemplateWorkingDocumentSection): string {
  const parts = [section.heading]
  if (section.body.trim()) parts.push(section.body.trim())
  return parts.join('\n\n')
}

/** Simple print-ready HTML — no UI chrome. */
export function renderWorkingDocumentPrintHtml(document: OrbTemplateWorkingDocument): string {
  const body = copyWorkingDocumentText(document, { includeDraftReviewNote: document.status === 'draft' })
    .split('\n')
    .map((line) => {
      if (!line.trim()) return '<br/>'
      if (line.startsWith('| ')) return `<p style="font-family:monospace;font-size:12px">${line}</p>`
      return `<p>${line.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`
    })
    .join('\n')

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${document.title}</title>
<style>body{font-family:Georgia,serif;max-width:720px;margin:2rem auto;line-height:1.5;color:#111}</style>
</head><body><h1>${document.title}</h1>${body}</body></html>`
}
