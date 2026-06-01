export type OrbDictateSectionChange = {
  heading: string
  before: string
  after: string
  changed: boolean
}

export function splitOrbDictateSections(text: string): { heading: string; body: string }[] {
  const lines = text.split('\n')
  const sections: { heading: string; body: string }[] = []
  let currentHeading = 'Document'
  let bodyLines: string[] = []

  for (const line of lines) {
    const headingMatch = /^#{1,3}\s+(.+)$/.exec(line.trim())
    if (headingMatch) {
      if (bodyLines.length || sections.length) {
        sections.push({ heading: currentHeading, body: bodyLines.join('\n').trim() })
      }
      currentHeading = headingMatch[1].trim()
      bodyLines = []
      continue
    }
    bodyLines.push(line)
  }
  sections.push({ heading: currentHeading, body: bodyLines.join('\n').trim() })
  return sections.filter((s) => s.body.length > 0 || s.heading !== 'Document')
}

export function diffOrbDictateSections(before: string, after: string): OrbDictateSectionChange[] {
  const beforeMap = new Map(splitOrbDictateSections(before).map((s) => [s.heading, s.body]))
  const afterSections = splitOrbDictateSections(after)
  const changes: OrbDictateSectionChange[] = []

  for (const section of afterSections) {
    const prev = beforeMap.get(section.heading) ?? ''
  const changed = prev.trim() !== section.body.trim()
    if (changed || !beforeMap.has(section.heading)) {
      changes.push({
        heading: section.heading,
        before: prev || '(empty)',
        after: section.body,
        changed: true
      })
    }
  }

  if (!changes.length && before.trim() !== after.trim()) {
    changes.push({
      heading: 'Document',
      before: before.slice(0, 600),
      after: after.slice(0, 600),
      changed: true
    })
  }

  return changes
}

export function paragraphLevelDiffSummary(before: string, after: string): string[] {
  const beforeParas = before.split(/\n\n+/).map((p) => p.trim()).filter(Boolean)
  const afterParas = after.split(/\n\n+/).map((p) => p.trim()).filter(Boolean)
  const summary: string[] = []
  const max = Math.max(beforeParas.length, afterParas.length)
  for (let i = 0; i < max; i++) {
    const b = beforeParas[i] || ''
    const a = afterParas[i] || ''
    if (b !== a) summary.push(`Paragraph ${i + 1} changed`)
  }
  return summary.slice(0, 12)
}
