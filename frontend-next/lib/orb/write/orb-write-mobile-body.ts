/** Escape text for safe HTML insertion in the mobile notepad surface. */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function stripMarkdownEmphasis(line: string): string {
  return line.replace(/^\*([^*]+)\*$/m, '$1').replace(/^_([^_]+)_$/m, '$1').trim()
}

/**
 * Present markdown-style ORB Write template bodies as polished notepad HTML on mobile.
 * Stored export structure can remain markdown; this is display-only unless the user edits.
 */
export function orbWriteBodyToMobileNotepadHtml(body: string): string {
  const trimmed = body.trim()
  if (!trimmed) return ''
  if (/<[a-z][\s\S]*>/i.test(trimmed)) return trimmed
  if (!/^##\s+/m.test(trimmed)) {
    return trimmed.replace(/\n/g, '<br/>')
  }

  const sections = trimmed.split(/^##\s+/m).filter(Boolean)
  return sections
    .map((section) => {
      const lines = section.trim().split('\n')
      const title = lines[0]?.trim() ?? ''
      const bodyLines = lines.slice(1).join('\n').trim()
      const placeholder = stripMarkdownEmphasis(bodyLines)
      const placeholderHtml = placeholder
        ? `<p class="orb-write-section-hint" data-orb-write-placeholder="true" contenteditable="false">${escapeHtml(placeholder)}</p>`
        : ''
      return `<h2>${escapeHtml(title)}</h2>${placeholderHtml}<p><br></p>`
    })
    .join('')
}

export function orbWriteBodyLooksLikeMarkdownTemplate(body: string): boolean {
  return /^##\s+/m.test(body.trim()) && !/<[a-z][\s\S]*>/i.test(body.trim())
}
