/** Mobile ORB Write — one-section-at-a-time parsing and body rebuild. */

export type OrbWriteMobileSection = {
  id: string
  title: string
  hint: string
  body: string
}

function slugify(title: string, index: number): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return base || `section-${index + 1}`
}

function stripMarkdownEmphasis(line: string): string {
  return line.replace(/^\*([^*]+)\*$/m, '$1').replace(/^_([^_]+)_$/m, '$1').trim()
}

function parseMarkdownSections(body: string): OrbWriteMobileSection[] {
  const trimmed = body.trim()
  if (!trimmed) return []

  if (!/^##\s+/m.test(trimmed)) {
    return [
      {
        id: 'document',
        title: 'Document',
        hint: '',
        body: trimmed
      }
    ]
  }

  const parts = trimmed.split(/^##\s+/m).filter(Boolean)
  return parts.map((part, index) => {
    const lines = part.trim().split('\n')
    const title = lines[0]?.trim() ?? `Section ${index + 1}`
    const rest = lines.slice(1)
    let hint = ''
    let bodyStart = 0
    for (let i = 0; i < rest.length; i += 1) {
      const line = rest[i]?.trim() ?? ''
      if (!line) {
        bodyStart = i + 1
        continue
      }
      if (/^\*[^*]+\*$/.test(line) || /^_[^_]+_$/.test(line)) {
        hint = stripMarkdownEmphasis(line)
        bodyStart = i + 1
        break
      }
      break
    }
    const body = rest
      .slice(bodyStart)
      .join('\n')
      .trim()
    return {
      id: slugify(title, index),
      title,
      hint,
      body
    }
  })
}

function parseHtmlSections(body: string): OrbWriteMobileSection[] {
  if (typeof document === 'undefined') {
    return [{ id: 'document', title: 'Document', hint: '', body }]
  }
  const container = document.createElement('div')
  container.innerHTML = body

  const headings = container.querySelectorAll('h2')
  if (!headings.length) {
    return [
      {
        id: 'document',
        title: 'Document',
        hint: '',
        body: container.innerText?.trim() ?? ''
      }
    ]
  }

  const sections: OrbWriteMobileSection[] = []
  headings.forEach((heading, index) => {
    const title = heading.textContent?.trim() ?? `Section ${index + 1}`
    const nodes: ChildNode[] = []
    let sibling = heading.nextSibling
    while (sibling) {
      if (sibling.nodeType === Node.ELEMENT_NODE && (sibling as Element).tagName === 'H2') break
      nodes.push(sibling)
      sibling = sibling.nextSibling
    }
    const fragment = document.createElement('div')
    nodes.forEach((node) => fragment.appendChild(node.cloneNode(true)))
    const hintEl = fragment.querySelector('[data-orb-write-placeholder="true"], .orb-write-section-hint')
    const hint = hintEl?.textContent?.trim() ?? ''
    if (hintEl) hintEl.remove()
    const sectionBody = (fragment.innerText ?? fragment.textContent ?? '').trim()
    sections.push({
      id: slugify(title, index),
      title,
      hint,
      body: sectionBody
    })
  })
  return sections
}

/** Parse a document body into discrete mobile sections. */
export function parseOrbWriteMobileSections(body: string): OrbWriteMobileSection[] {
  const trimmed = body.trim()
  if (!trimmed) {
    return [
      {
        id: 'document',
        title: 'Document',
        hint: 'Start typing your record here.',
        body: ''
      }
    ]
  }
  if (/<h2[\s>]/i.test(trimmed)) {
    return parseHtmlSections(trimmed)
  }
  return parseMarkdownSections(trimmed)
}

/** Rebuild markdown body from mobile sections (preserves template structure). */
export function rebuildOrbWriteMarkdownFromSections(sections: OrbWriteMobileSection[]): string {
  return sections
    .map((section) => {
      const hintLine = section.hint ? `*${section.hint}*\n\n` : ''
      const body = section.body.trim()
      return `## ${section.title}\n\n${hintLine}${body}`.trimEnd()
    })
    .join('\n\n')
    .trim()
}

/** Whether the body uses markdown section headings (vs plain/HTML). */
export function orbWriteBodyUsesMarkdownSections(body: string): boolean {
  const trimmed = body.trim()
  if (!trimmed) return true
  if (/<h2[\s>]/i.test(trimmed)) return false
  return /^##\s+/m.test(trimmed) || !trimmed.includes('<')
}
