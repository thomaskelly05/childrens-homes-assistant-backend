import type { OrbTemplateWorkingDocument } from '@/lib/orb/template/orb-template-working-document-types'

export const ORB_WRITE_WORKING_DOCUMENT_HANDOFF_KEY = 'orb-write-working-document-handoff-v1'

export type OrbWriteWorkingDocumentHandoffPayload = {
  working_document: OrbTemplateWorkingDocument
  source_station: string
  source_label: string
  timestamp: string
}

export function saveOrbWriteWorkingDocumentHandoff(
  workingDocument: OrbTemplateWorkingDocument,
  opts?: { source_station?: string; source_label?: string }
): void {
  if (typeof window === 'undefined') return
  const payload: OrbWriteWorkingDocumentHandoffPayload = {
    working_document: workingDocument,
    source_station: opts?.source_station ?? workingDocument.source_station ?? 'write',
    source_label: opts?.source_label ?? workingDocument.title,
    timestamp: new Date().toISOString()
  }
  try {
    sessionStorage.setItem(ORB_WRITE_WORKING_DOCUMENT_HANDOFF_KEY, JSON.stringify(payload))
  } catch {
    /* session quota */
  }
}

export function loadOrbWriteWorkingDocumentHandoff(): OrbWriteWorkingDocumentHandoffPayload | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(ORB_WRITE_WORKING_DOCUMENT_HANDOFF_KEY)
    if (!raw) return null
    return JSON.parse(raw) as OrbWriteWorkingDocumentHandoffPayload
  } catch {
    return null
  }
}

export function clearOrbWriteWorkingDocumentHandoff(): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.removeItem(ORB_WRITE_WORKING_DOCUMENT_HANDOFF_KEY)
  } catch {
    /* ignore */
  }
}

/** Convert working document sections to HTML body for ORB Write editor. */
export function workingDocumentToWriteBody(document: OrbTemplateWorkingDocument): string {
  const parts: string[] = []
  for (const section of [...document.sections].sort((a, b) => a.sort_order - b.sort_order)) {
    parts.push(`<h2>${section.heading}</h2>`)
    if (section.guidance) {
      parts.push(`<p><em>${section.guidance}</em></p>`)
    }
    if (section.body) {
      parts.push(`<p>${section.body.replace(/\n/g, '<br/>')}</p>`)
    } else if (section.prompt) {
      parts.push(`<p><em>${section.prompt}</em></p>`)
    } else {
      parts.push('<p><br/></p>')
    }
  }
  for (const table of document.tables) {
    parts.push(`<h3>${table.title}</h3>`)
    if (table.columns.length) {
      parts.push('<table border="1" cellpadding="4"><thead><tr>')
      for (const col of table.columns) {
        parts.push(`<th>${col}</th>`)
      }
      parts.push('</tr></thead><tbody>')
      if (table.rows.length) {
        for (const row of table.rows) {
          parts.push('<tr>')
          for (const col of table.columns) {
            parts.push(`<td>${String(row[col] ?? '')}</td>`)
          }
          parts.push('</tr>')
        }
      } else {
        parts.push(
          `<tr><td colspan="${table.columns.length}"><em>${table.empty_state_guidance ?? 'Add rows as evidence is gathered.'}</em></td></tr>`
        )
      }
      parts.push('</tbody></table>')
    }
  }
  for (const chart of document.charts) {
    parts.push(`<h3>${chart.title}</h3>`)
    if (chart.has_data) {
      parts.push(`<p><em>[Chart: ${chart.chart_type}]</em></p>`)
    } else {
      parts.push(`<p><em>${chart.empty_state_guidance}</em></p>`)
    }
  }
  return parts.join('')
}
