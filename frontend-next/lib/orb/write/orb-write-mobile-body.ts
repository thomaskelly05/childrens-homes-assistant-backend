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

function isTableRow(line: string): boolean {
  const trimmed = line.trim()
  return trimmed.includes('|') && !/^[-|:\s]+$/.test(trimmed)
}

function isTableSeparator(line: string): boolean {
  return /^\|?[\s:-]+\|[\s|:-]+$/.test(line.trim())
}

function parseTableRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => stripMarkdownEmphasis(cell.trim()))
}

function renderMarkdownTable(lines: string[]): string {
  const rows = lines.filter((line) => isTableRow(line) && !isTableSeparator(line))
  if (!rows.length) return ''
  const header = parseTableRow(rows[0])
  const bodyRows = rows.slice(1)
  const thead = `<thead><tr>${header.map((cell) => `<th>${escapeHtml(cell)}</th>`).join('')}</tr></thead>`
  const tbody = bodyRows.length
    ? `<tbody>${bodyRows
        .map(
          (row) =>
            `<tr>${parseTableRow(row)
              .map((cell) => `<td>${escapeHtml(cell)}</td>`)
              .join('')}</tr>`
        )
        .join('')}</tbody>`
    : `<tbody><tr>${header.map(() => '<td><br></td>').join('')}</tr></tbody>`
  return `<table class="orb-write-md-table" data-orb-write-table="true">${thead}${tbody}</table>`
}

function renderListBlock(lines: string[], ordered: boolean): string {
  const tag = ordered ? 'ol' : 'ul'
  const items = lines
    .map((line) => {
      const checkbox = line.match(/^[-*]\s+\[([ xX])\]\s+(.*)$/)
      if (checkbox) {
        const checked = checkbox[1].toLowerCase() === 'x'
        return `<li class="orb-write-checklist-item"><label><input type="checkbox"${checked ? ' checked' : ''} disabled /> ${escapeHtml(stripMarkdownEmphasis(checkbox[2]))}</label></li>`
      }
      const bullet = line.replace(/^[-*+]\s+/, '').replace(/^\d+\.\s+/, '')
      return `<li>${escapeHtml(stripMarkdownEmphasis(bullet))}</li>`
    })
    .join('')
  return `<${tag} class="orb-write-md-list">${items}</${tag}>`
}

function renderSectionBody(bodyLines: string[]): string {
  const chunks: string[] = []
  let index = 0
  while (index < bodyLines.length) {
    const line = bodyLines[index]
    const trimmed = line.trim()
    if (!trimmed) {
      index += 1
      continue
    }
    if (isTableRow(trimmed) || (bodyLines[index + 1] && isTableSeparator(bodyLines[index + 1]?.trim() ?? ''))) {
      const tableLines: string[] = []
      while (index < bodyLines.length) {
        const current = bodyLines[index].trim()
        if (!current) break
        if (isTableRow(current) || isTableSeparator(current)) {
          tableLines.push(bodyLines[index])
          index += 1
          continue
        }
        break
      }
      chunks.push(renderMarkdownTable(tableLines))
      continue
    }
    if (/^[-*+]\s+/.test(trimmed) || /^[-*]\s+\[([ xX])\]\s+/.test(trimmed)) {
      const listLines: string[] = []
      while (index < bodyLines.length) {
        const current = bodyLines[index].trim()
        if (!current || (!/^[-*+]\s+/.test(current) && !/^[-*]\s+\[([ xX])\]\s+/.test(current))) break
        listLines.push(bodyLines[index])
        index += 1
      }
      chunks.push(renderListBlock(listLines, false))
      continue
    }
    if (/^\d+\.\s+/.test(trimmed)) {
      const listLines: string[] = []
      while (index < bodyLines.length) {
        const current = bodyLines[index].trim()
        if (!current || !/^\d+\.\s+/.test(current)) break
        listLines.push(bodyLines[index])
        index += 1
      }
      chunks.push(renderListBlock(listLines, true))
      continue
    }
    if (/^###\s+/.test(trimmed)) {
      chunks.push(`<h3>${escapeHtml(trimmed.replace(/^###\s+/, ''))}</h3>`)
      index += 1
      continue
    }
    const paragraph = [trimmed]
    index += 1
    while (index < bodyLines.length) {
      const next = bodyLines[index].trim()
      if (
        !next ||
        /^##\s+/.test(next) ||
        /^###\s+/.test(next) ||
        /^[-*+]\s+/.test(next) ||
        /^\d+\.\s+/.test(next) ||
        isTableRow(next)
      ) {
        break
      }
      paragraph.push(next)
      index += 1
    }
    const raw = paragraph.join(' ').trim()
    const isHint = /^\*[^*]+\*$/.test(raw)
    const text = stripMarkdownEmphasis(raw)
    if (isHint) {
      chunks.push(
        `<p class="orb-write-section-hint" data-orb-write-placeholder="true" contenteditable="false">${escapeHtml(text)}</p>`
      )
    } else {
      chunks.push(`<p>${escapeHtml(text)}</p>`)
    }
  }
  return chunks.join('')
}

/**
 * Present markdown-style ORB Write template bodies as polished notepad HTML on mobile.
 * Stored export structure can remain markdown; this is display-only unless the user edits.
 */
export function orbWriteBodyToMobileNotepadHtml(body: string): string {
  const trimmed = body.trim()
  if (!trimmed) return ''
  if (/<[a-z][\s\S]*>/i.test(trimmed)) return trimmed
  if (!/^##\s+/m.test(trimmed) && !/^\|/.test(trimmed) && !/^[-*+]\s+/m.test(trimmed)) {
    return renderSectionBody(trimmed.split('\n'))
  }

  if (!/^##\s+/m.test(trimmed)) {
    return renderSectionBody(trimmed.split('\n'))
  }

  const sections = trimmed.split(/^##\s+/m).filter(Boolean)
  return sections
    .map((section) => {
      const lines = section.trim().split('\n')
      const title = lines[0]?.trim() ?? ''
      const bodyLines = lines.slice(1)
      const bodyHtml = renderSectionBody(bodyLines)
      return `<h2>${escapeHtml(title)}</h2>${bodyHtml}<p><br></p>`
    })
    .join('')
}

export function orbWriteBodyLooksLikeMarkdownTemplate(body: string): boolean {
  const trimmed = body.trim()
  if (!trimmed || /<[a-z][\s\S]*>/i.test(trimmed)) return false
  return (
    /^##\s+/m.test(trimmed) ||
    /^\|.*\|/m.test(trimmed) ||
    /^[-*+]\s+/m.test(trimmed) ||
    /^[-*]\s+\[[ xX]\]\s+/m.test(trimmed)
  )
}
