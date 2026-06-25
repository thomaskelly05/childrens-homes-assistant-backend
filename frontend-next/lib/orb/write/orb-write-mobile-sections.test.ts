import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  parseOrbWriteMobileSections,
  rebuildOrbWriteMarkdownFromSections
} from './orb-write-mobile-sections.ts'

describe('parseOrbWriteMobileSections', () => {
  it('splits markdown template into titled sections with hints', () => {
    const input = `## Summary

*Brief overview of the situation or note.*

Some notes here.

## What was observed or shared

*Factual account without judgement.*

Observation text.`

    const sections = parseOrbWriteMobileSections(input)
    assert.equal(sections.length, 2)
    assert.equal(sections[0].title, 'Summary')
    assert.match(sections[0].hint, /Brief overview/)
    assert.match(sections[0].body, /Some notes here/)
    assert.equal(sections[1].title, 'What was observed or shared')
  })

  it('rebuilds markdown body from edited sections', () => {
    const sections = parseOrbWriteMobileSections(`## Summary\n\n*Hint*\n\nBody`)
    const rebuilt = rebuildOrbWriteMarkdownFromSections(
      sections.map((section, index) =>
        index === 0 ? { ...section, body: 'Updated body' } : section
      )
    )
    assert.match(rebuilt, /## Summary/)
    assert.match(rebuilt, /Updated body/)
    assert.match(rebuilt, /\*Hint\*/)
  })

  it('returns a single document section when no headings exist', () => {
    const sections = parseOrbWriteMobileSections('Plain text only')
    assert.equal(sections.length, 1)
    assert.equal(sections[0].title, 'Document')
    assert.equal(sections[0].body, 'Plain text only')
  })
})
